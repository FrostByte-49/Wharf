import { GithubService } from './github.service';
import { cacheService } from './cache.service';
import { AiService } from './ai.service';
import {
  buildChangelogPrompt,
  ChangelogOptions,
  CommitGroup,
  CommitInfo,
} from '../utils/changelogPromptBuilder';
import { getPrisma } from '../db';

export interface ChangelogStats {
  totalCommits: number;
  contributors: number;
  tags: number;
  commitsByType: Record<string, number>;
  oldestCommitDate: string | null;
  newestCommitDate: string | null;
  tagList: string[];
}

export class ChangelogService {
  constructor(
    private githubService: GithubService,
    private aiService: AiService,
    private dbUrl: string
  ) {}

  async getCommitStats(repoUrl: string, githubToken?: string): Promise<ChangelogStats> {
    // Use Token-Aware Cache Key
    const cacheKey = `${repoUrl}:${githubToken ? 'auth' : 'anon'}`;
    const cachedStats = await cacheService.getChangelogStats(cacheKey);
    if (cachedStats) return cachedStats;

    // Create A Token-Aware GithubService Instance
    const gh = githubToken ? new GithubService({ token: githubToken }) : this.githubService;
    const { owner, repo } = this.extractOwnerRepo(repoUrl);

    const [commits, contributors, tags] = await Promise.all([
      gh.getCommits(owner, repo, 500), // 500 Limit
      gh.getContributors(owner, repo),
      gh.getTags(owner, repo),
    ]);

    const commitsByType: Record<string, number> = {
      feat: 0,
      fix: 0,
      refactor: 0,
      breaking: 0,
      chore: 0,
      docs: 0,
      style: 0,
      test: 0,
      perf: 0,
      ci: 0,
      build: 0,
    };

    commits.forEach((c: any) => {
      if (commitsByType[c.type] !== undefined) {
        commitsByType[c.type]++;
      } else {
        commitsByType['chore'] = (commitsByType['chore'] || 0) + 1;
      }
    });

    const dates = commits.map((c: any) => new Date(c.author.date).getTime()).filter(Boolean);

    const stats: ChangelogStats = {
      totalCommits: commits.length,
      contributors: contributors.length,
      tags: tags.length,
      tagList: tags,
      commitsByType,
      oldestCommitDate: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null,
      newestCommitDate: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null,
    };

    await cacheService.setChangelogStats(cacheKey, stats);
    return stats;
  }

async generateChangelog(
  repoUrl: string,
  options: ChangelogOptions,
  githubToken?: string
): Promise<
  | { empty: true; message: string }
  | { stream: AsyncGenerator<string>; provider: string }
> {
  const gh = githubToken ? new GithubService({ token: githubToken }) : this.githubService;
  const { owner, repo } = this.extractOwnerRepo(repoUrl);

  const commitLimit = Math.min(options.commitCount || 100, 500);
  const slicedCommits = await gh.getCommits(owner, repo, commitLimit);

  // Fetch tags even when tag inclusion is disabled, to detect a truly empty repository.
  const repositoryTags = await gh.getTags(owner, repo);

  if (slicedCommits.length === 0 && repositoryTags.length === 0) {
    return {
      empty: true,
      message: 'No commits or release tags found in this repository.',
    };
  }

  const tags = options.includeTags ? repositoryTags : [];
  const groups = this.groupCommits(slicedCommits);
  const prompt = buildChangelogPrompt(groups, options, `${owner}/${repo}`, tags);

  return this.aiService.generateChangelogStream(prompt);
}


  async getHistory(userId: string, page: number = 1, limit: number = 50) {
    limit = Math.min(limit, 200);
    const skip = (page - 1) * limit;
    const prisma = getPrisma(this.dbUrl);
    return prisma.changelog.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true,
        repoUrl: true,
        repoName: true,
        content: true,
        commitCount: true,
        generatedAt: true,
        format: true,
      },
    });
  }

  async deleteChangelog(id: string, userId: string): Promise<void> {
    const prisma = getPrisma(this.dbUrl);
    // High-Water Mark Prerequisite Sync: Lock In Current Count
    const dynamicChangelogs = await prisma.changelog.count({ where: { userId } });
    await prisma.$executeRaw`UPDATE "User" SET "lifetimeChangelogs" = GREATEST("lifetimeChangelogs", ${dynamicChangelogs}) WHERE id = ${userId}`;

    await prisma.changelog.delete({
      where: { id, userId },
    });
  }

  private groupCommits(commits: any[]): CommitGroup[] {
    const groups: Record<string, CommitInfo[]> = {};
    commits.forEach((c) => {
      if (!groups[c.type]) groups[c.type] = [];
      groups[c.type].push({
        sha: c.sha,
        shortSha: c.shortSha || c.sha.slice(0, 7),
        message: c.message,
        subject: c.subject,
        body: c.body || null,
        author: {
          name: c.author?.name || 'Unknown',
          email: c.author?.email || '',
          date: c.author?.date || new Date().toISOString(),
          login: c.author?.login || null,
        },
        type: c.type,
        url: c.url || '',
      });
    });

    return Object.entries(groups).map(([type, groupCommits]) => ({
      type,
      commits: groupCommits,
    }));
  }

  public extractOwnerRepo(repoUrl: string): { owner: string; repo: string } {
    try {
      // Handle git+https, ssh, or plain https URLs
      const cleaned = repoUrl
        .replace(/^git\+/, '')
        .replace(/\.git$/, '')
        .trim();
      const url = new URL(cleaned);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1] };
      }
      throw new Error('Invalid repository URL');
    } catch {
      throw new Error('Invalid repository URL format. Use: https://github.com/owner/repo');
    }
  }
}
