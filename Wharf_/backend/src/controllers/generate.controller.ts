import { Context } from 'hono';
import { stream } from 'hono/streaming';
import { RepoService } from '../services/repo.service';
import { AiService } from '../services/ai.service';
import { cacheService } from '../services/cache.service';
import { parseGithubUrl } from '../utils/parseGithubUrl';
import { decrypt } from '../utils/encryption';
import { getPrisma } from '../db';
import { recordDailyGeneration } from '../utils/dailyStats';
import { loggerService, saveRequestLog } from '../utils/logger';
import { Bindings } from '../index';
import { readEphemeralByok, type EphemeralByokKey } from '../utils/ephemeralByok';

type AppContext = Context<{ Bindings: Bindings; Variables: { user: any; contextStore: any } }>;

export const generateReadme = async (c: AppContext) => {
  const reqStart = Date.now();
  const body = await c.req.json().catch(() => ({}));
  const { repoUrl, tone, sections } = body;
  const user = c.get('user');
  const userId = user?.userId;
  let ephemeralKey: EphemeralByokKey | undefined;
  try {
    ephemeralKey = readEphemeralByok(c) ?? undefined;
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Invalid BYOK header' }, 400);
  }

  if (!repoUrl || !tone || !sections || !Array.isArray(sections)) {
    return c.json({ success: false, error: 'repoUrl, tone, and sections are required fields' }, 400);
  }

  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    return c.json({ success: false, error: 'Invalid GitHub URL' }, 400);
  }

  const { owner, repo } = parsed;

  try {
    const cacheStart = loggerService.stepStart();
    const cachedReadme = await cacheService.getReadme(owner, repo, tone, sections);
    loggerService.stepEnd('cache.lookup.completed', 'Cache Lookup Completed', cacheStart, {
      repository: `${owner}/${repo}`,
    });

    if (cachedReadme) {
      loggerService.cacheHit(`${owner}/${repo}`);
      await saveRequestLog({
        route: c.req.path,
        method: c.req.method,
        feature: 'README',
        statusCode: 200,
        cacheHit: true,
        totalDurationMs: Date.now() - reqStart,
      });

      c.header('Content-Type', 'text/event-stream');
      c.header('Cache-Control', 'no-cache');
      c.header('Connection', 'keep-alive');
      return stream(c, async (streamStr) => {
        const chunkSize = 100;
        for (let i = 0; i < cachedReadme.length; i += chunkSize) {
          const chunk = cachedReadme.slice(i, i + chunkSize);
          await streamStr.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          await new Promise((resolve) => setTimeout(resolve, 10)); 
        }
          await streamStr.write('data: [DONE]\n\n');
      });
    }

    let token: string | undefined;
    let installationId: string | undefined;
    let encryptedToken = user?.githubAccessToken;

    const prisma = getPrisma(c.env.DATABASE_URL);
    if (userId) {
      if (encryptedToken) {
        token = decrypt(encryptedToken, c.env.ENCRYPTION_SECRET);
      } else {
        try {
          const userDb = await prisma.user.findUnique({
            where: { id: userId },
            select: { githubAccessToken: true, installationId: true } as any,
          });

          if (typeof userDb?.githubAccessToken === 'string') {
            token = decrypt(userDb.githubAccessToken as string, c.env.ENCRYPTION_SECRET);
          }
          if (userDb?.installationId) {
            installationId = userDb.installationId as unknown as string;
          }
        } catch (dbErr: any) {
          loggerService.warn('database.read.error', 'Failed to read user from DB in generate.controller', dbErr);
        }
      }
    }

    const repoService = new RepoService({ token, installationId });
    const githubStart = loggerService.stepStart();
    const repoContext = await repoService.analyzeRepo(repoUrl);
    loggerService.stepEnd('github.fetch.completed', 'GitHub Fetch Completed', githubStart, { repository: `${owner}/${repo}` });

    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    return stream(c, async (streamStr) => {
      const aiStart = loggerService.stepStart();
      const aiService = new AiService(c.env.DATABASE_URL);
      const { text: generatedMarkdown, provider } = await aiService.generateReadmeStream(
        repoContext,
        tone,
        sections,
        userId,
        async (chunk) => {
          await streamStr.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        },
        ephemeralKey
      );
      loggerService.stepEnd('generation.ai.completed', 'AI Generation Completed', aiStart, {
        repository: `${owner}/${repo}`,
        provider,
      });

      // Background non-blocking tasks
      const bgTask = async () => {
        const mdProcStart = loggerService.stepStart();
        await cacheService.setReadme(owner, repo, tone, sections, generatedMarkdown);

        if (userId) {
          const dbStart = loggerService.stepStart();
          try {
            const repository = await prisma.repository.upsert({
              where: { owner_name_userId: { owner, name: repo, userId } },
              update: {
                description: repoContext.meta.description,
                stars: repoContext.meta.stars,
                language: repoContext.meta.language,
              },
              create: {
                owner,
                name: repo,
                userId,
                url: repoUrl,
                description: repoContext.meta.description,
                stars: repoContext.meta.stars,
                language: repoContext.meta.language,
              },
            });

            const wordCount = generatedMarkdown.split(/\s+/).filter(Boolean).length;
            const tokensGenerated = Math.round(wordCount * 1.37);

            const genRecord = await prisma.generation.create({
              data: {
                type: 'README',
                content: generatedMarkdown,
                wordCount,
                options: { tone, sections },
                repoId: repository.id,
              },
            });
            loggerService.stepEnd('database.save.completed', 'DB Save Completed', dbStart, {
              table: 'Generation',
              recordId: genRecord.id,
            });

            await Promise.all([
              prisma.$executeRaw`UPDATE "User" SET "lifetimeTokens" = "lifetimeTokens" + ${tokensGenerated}, "lifetimeReadmes" = "lifetimeReadmes" + 1 WHERE id = ${userId}`,
              recordDailyGeneration(c.env.DATABASE_URL, userId)
            ]);
          } catch (dbError) {
            loggerService.error('database.save.error', 'Failed to save generation to DB', dbError);
          }
        }
        loggerService.stepEnd('markdown.processing.completed', 'Markdown Processing Completed', mdProcStart);
      };

      try {
        c.executionCtx.waitUntil(bgTask());
      } catch {
        if (process.env.NODE_ENV !== 'test') {
          bgTask().catch(console.error);
        }
      }

      loggerService.info('generation.completed', 'README generated successfully', {
        repository: `${owner}/${repo}`,
        cache: 'MISS',
        durationMs: Date.now() - reqStart,
      });
      await saveRequestLog({
        route: c.req.path,
        method: c.req.method,
        feature: 'README',
        statusCode: 200,
        cacheHit: false,
        finalProvider: provider,
        targetRepo: `${owner}/${repo}`,
        totalDurationMs: Date.now() - reqStart,
      });

      await streamStr.write('data: [DONE]\n\n');
    });
  } catch (error: any) {
    loggerService.error('generation.error', 'README generation error', error, {
      repository: `${owner}/${repo}`,
    });
    await saveRequestLog({
      route: c.req.path,
      method: c.req.method,
      feature: 'README',
      statusCode: 500,
      error: error.message,
      totalDurationMs: Date.now() - reqStart,
    });
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    return stream(c, async (streamStr) => {
      await streamStr.write(`data: ${JSON.stringify({ error: error.message || 'Failed to generate README' })}\n\n`);
    });
  }
};

export const getHistory = async (c: AppContext) => {
  const user = c.get('user');
  const userId = user?.userId;
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
  const skip = (page - 1) * limit;

  if (!userId) {
    return c.json({ success: false, error: 'Authentication required' }, 401);
  }

  try {
    const prisma = getPrisma(c.env.DATABASE_URL);
    const history = await prisma.generation.findMany({
      where: {
        repository: {
          userId,
        },
      },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        wordCount: true,
        createdAt: true,
        repository: {
          select: { owner: true, name: true, url: true, language: true, stars: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({ success: true, data: history });
  } catch (error: any) {
    loggerService.error('database.fetch.error', 'Failed to fetch generation history', error);
    return c.json({ success: false, error: 'Failed to fetch generation history' }, 500);
  }
};

export const getHistoryById = async (c: AppContext) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const userId = user?.userId;

  if (!userId) return c.json({ success: false, error: 'Authentication required' }, 401);

  try {
    const prisma = getPrisma(c.env.DATABASE_URL);
    const record = await prisma.generation.findUnique({
      where: { id },
      include: {
        repository: true,
      },
    });

    if (!record || record.repository.userId !== userId) {
      return c.json({ success: false, error: 'Record not found' }, 404);
    }

    return c.json({ success: true, data: record });
  } catch (error: any) {
    loggerService.error('database.fetch.error', 'Failed to fetch generation by ID', error, { paramId: id });
    return c.json({ success: false, error: 'Failed to fetch generation' }, 500);
  }
};

export const deleteHistoryItem = async (c: AppContext) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const userId = user?.userId;

  if (!userId) return c.json({ success: false, error: 'Authentication required' }, 401);

  try {
    const prisma = getPrisma(c.env.DATABASE_URL);
    const record = await prisma.generation.findUnique({
      where: { id },
      include: { repository: true },
    });

    if (!record || record.repository.userId !== userId) {
      return c.json({ success: false, error: 'Record not found' }, 404);
    }

    const userDynamicReadmes = await prisma.generation.count({
      where: { repository: { userId }, type: 'README' },
    });
    await prisma.$executeRaw`UPDATE "User" SET "lifetimeReadmes" = GREATEST("lifetimeReadmes", ${userDynamicReadmes}) WHERE id = ${userId}`;

    await prisma.generation.delete({ where: { id } });
    return c.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    loggerService.error('database.delete.error', 'Failed to delete generation', error, { paramId: id });
    return c.json({ success: false, error: 'Failed to delete record' }, 500);
  }
};
