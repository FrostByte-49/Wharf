import { Context } from 'hono';
import { stream } from 'hono/streaming';
import { ChangelogService, GithubService, cacheService } from '../services';
import { AiService } from '../services/ai.service';
import { getPrisma } from '../db';
import { decrypt } from '../utils/encryption';
import { recordDailyGeneration } from '../utils/dailyStats';
import { loggerService, saveRequestLog } from '../utils/logger';
import { Bindings } from '../index';

type AppContext = Context<{ Bindings: Bindings; Variables: { user: any; contextStore: any } }>;

function extractRepoName(repoUrl: string): string {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return repoUrl;
  } catch {
    const parts = repoUrl.split('/');
    return parts.slice(-2).join('/');
  }
}

export class ChangelogController {

  async getStats(c: AppContext) {
    const reqStart = Date.now();
    
    const body = await c.req.json().catch(() => ({}));
    const repoUrl = body.repoUrl;
    
    if (!repoUrl) {
      return c.json({ success: false, error: 'repoUrl is required' }, 400);
    }

    try {
      const user = c.get('user');
      let githubToken;
      if (user?.githubAccessToken) {
        githubToken = decrypt(user.githubAccessToken, c.env.ENCRYPTION_SECRET);
      }

      const stats = await new ChangelogService(new GithubService(), new AiService(c.env.DATABASE_URL), c.env.DATABASE_URL).getCommitStats(repoUrl, githubToken);
      return c.json({ success: true, data: stats });
    } catch (error: any) {
      loggerService.error('github.fetch.error', 'Changelog getStats error', error, {
        repository: repoUrl,
      });
      return c.json({ success: false, error: error.message }, 500);
    }
  }

  async generate(c: AppContext) {
    const reqStart = Date.now();
    const body = await c.req.json().catch(() => ({}));
    const { repoUrl, options = {} } = body;
    
    if (!repoUrl) {
      return c.json({ success: false, error: 'repoUrl is required' }, 400);
    }

    try {
      const user = c.get('user');
      let githubToken;
      if (user?.githubAccessToken) {
        githubToken = decrypt(user.githubAccessToken, c.env.ENCRYPTION_SECRET);
      }

      const cached = await cacheService.getChangelog(repoUrl, options);
      if (cached) {
        loggerService.cacheHit(repoUrl);
        await saveRequestLog({
          route: c.req.path,
          method: c.req.method,
          feature: 'CHANGELOG',
          statusCode: 200,
          cacheHit: true,
          totalDurationMs: Date.now() - reqStart,
        });
        c.header('Content-Type', 'text/event-stream');
        c.header('Cache-Control', 'no-cache');
        c.header('Connection', 'keep-alive');
        return stream(c, async (streamStr) => {
          await streamStr.write(`data: ${JSON.stringify({ text: cached })}\n\n`);
          await streamStr.write('data: [DONE]\n\n');
        });
      }     
const result = await new ChangelogService(
  new GithubService(),
  new AiService(c.env.DATABASE_URL),
  c.env.DATABASE_URL
).generateChangelog(repoUrl, options, githubToken);

if ('empty' in result) {
  await saveRequestLog({
    route: c.req.path,
    method: c.req.method,
    feature: 'CHANGELOG',
    statusCode: 200,
    cacheHit: false,
    targetRepo: extractRepoName(repoUrl),
    totalDurationMs: Date.now() - reqStart,
  });

  return c.json(result, 200);
}

const { stream: aiStream, provider } = result;


      c.header('Content-Type', 'text/event-stream');
      c.header('Cache-Control', 'no-cache');
      c.header('Connection', 'keep-alive');
      return stream(c, async (streamStr) => {
        let fullContent = '';

        for await (const chunk of aiStream) {
          fullContent += chunk;
          await streamStr.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }

        const bgTask = async () => {
          await cacheService.setChangelog(repoUrl, options, fullContent);
          const userId = c.get('user')?.id || c.get('user')?.userId;
          if (userId) {
            try {
              const wordCount = fullContent.split(/\s+/).filter(Boolean).length;
              const dbStart = loggerService.stepStart();
              const prisma = getPrisma(c.env.DATABASE_URL);
              
              const changelogRecord = await prisma.changelog.create({
                data: {
                  repoUrl,
                  repoName: extractRepoName(repoUrl),
                  content: fullContent,
                  wordCount,
                  format: options.format || 'keep-a-changelog',
                  commitCount: Number(options.commitCount) || 100,
                  includeTags: options.includeTags ?? true,
                  includeContributors: options.includeContributors ?? true,
                  groupByType: options.groupByType ?? true,
                  userId,
                },
              });
              loggerService.stepEnd('database.save.completed', 'DB Save Completed', dbStart, {
                table: 'Changelog',
                recordId: changelogRecord.id,
              });
              const tokensGenerated = Math.round(wordCount * 1.37);
              await Promise.all([
                prisma.$executeRaw`UPDATE "User" SET "lifetimeTokens" = "lifetimeTokens" + ${tokensGenerated}, "lifetimeChangelogs" = "lifetimeChangelogs" + 1 WHERE id = ${userId}`,
                recordDailyGeneration(c.env.DATABASE_URL, userId)
              ]);
            } catch (dbError) {
              loggerService.error('database.save.error', 'Changelog DB Save Error', dbError);
            }
          }
        };

        try {
          c.executionCtx.waitUntil(bgTask());
        } catch {
          if (process.env.NODE_ENV !== 'test') {
            bgTask().catch(console.error);
          }
        }

        loggerService.info('generation.completed', 'Changelog generated successfully', {
          repository: repoUrl,
          durationMs: Date.now() - reqStart,
        });
        await saveRequestLog({
          route: c.req.path,
          method: c.req.method,
          feature: 'CHANGELOG',
          statusCode: 200,
          cacheHit: false,
          finalProvider: provider,
          targetRepo: extractRepoName(repoUrl),
          totalDurationMs: Date.now() - reqStart,
        });

        await streamStr.write('data: [DONE]\n\n');
      });
    } catch (error: any) {
      loggerService.error('generation.error', 'Changelog generation error', error, {
        repository: repoUrl,
      });
      await saveRequestLog({
        route: c.req.path,
        method: c.req.method,
        feature: 'CHANGELOG',
        statusCode: 500,
        error: error.message,
        totalDurationMs: Date.now() - reqStart,
      });

      // Stream Error Response
      c.header('Content-Type', 'text/event-stream');
      c.header('Cache-Control', 'no-cache');
      c.header('Connection', 'keep-alive');
      return stream(c, async (streamStr) => {
        await streamStr.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      });
    }
  }

  async getHistory(c: AppContext) {
    try {
      const user = c.get('user');
      const userId = user?.id || user?.userId;
      const page = parseInt(c.req.query('page') || '1');
      const limit = parseInt(c.req.query('limit') || '100');

      if (!userId) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
      }
      const history = await new ChangelogService(new GithubService(), new AiService(c.env.DATABASE_URL), c.env.DATABASE_URL).getHistory(userId, page, limit);
      return c.json({ success: true, data: history });
    } catch (error: any) {
      loggerService.error('database.fetch.error', 'Changelog getHistory error', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  }

  async deleteChangelog(c: AppContext) {
    const id = c.req.param('id');
    try {
      const user = c.get('user');
      const userId = user?.id || user?.userId;
      if (!userId) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
      }

      await new ChangelogService(new GithubService(), new AiService(c.env.DATABASE_URL), c.env.DATABASE_URL).deleteChangelog(id!, String(userId));
      return c.json({ success: true });
    } catch (error: any) {
      loggerService.error('database.delete.error', 'Changelog delete error', error, {
        paramId: id,
      });
      return c.json({ success: false, error: error.message }, 500);
    }
  }
}
