import type { Mock } from "vitest";
import { ChangelogService } from '../../../src/services/changelog.service';
import { GithubService } from '../../../src/services/github.service';
import { AiService } from '../../../src/services/ai.service';
import { cacheService } from '../../../src/services/cache.service';
import prisma from '../../../src/db';

vi.mock('../../../src/services/github.service');
vi.mock('../../../src/services/ai.service');
vi.mock('../../../src/services/cache.service');
vi.mock('../../../src/db', () => {
  const prismaObj = {
    changelog: {
      findMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $executeRaw: vi.fn(),
  };
  return {
    __esModule: true,
    default: prismaObj,
    getPrisma: vi.fn().mockReturnValue(prismaObj),
  };
});

describe('ChangelogService', () => {
  let changelogService: ChangelogService;
  let mockGithubService: GithubService;
  let mockAiService: AiService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGithubService = new GithubService();
    mockAiService = new AiService('mock-db-url');
    changelogService = new ChangelogService(mockGithubService, mockAiService, 'mock-db-url');
  });

  describe('extractOwnerRepo', () => {
    it('should extract owner and repo from standard url', () => {
      const res = changelogService.extractOwnerRepo('https://github.com/FrostByte-49/Wharf');
      expect(res).toEqual({ owner: 'FrostByte-49', repo: 'Wharf' });
    });

    it('should throw expected error for bad urls', () => {
      expect(() => changelogService.extractOwnerRepo('invalid.com')).toThrow('Invalid repository URL format');
    });
  });

  describe('getCommitStats', () => {
    it('should return cached stats if present', async () => {
      const mockStats = { totalCommits: 50 };
      (cacheService.getChangelogStats as Mock).mockResolvedValue(mockStats);
      
      const res = await changelogService.getCommitStats('https://github.com/foo/bar');
      expect(res).toEqual(mockStats);
      expect(mockGithubService.getCommits).not.toHaveBeenCalled();
    });

    it('should fetch and generate stats correctly when cache misses', async () => {
      (cacheService.getChangelogStats as Mock).mockResolvedValue(null);
      
      const mockCommits = [
        { type: 'feat', author: { date: '2026-07-27T10:00:00Z' } },
        { type: 'feat', author: { date: '2026-07-28T10:00:00Z' } },
        { type: 'fix', author: { date: '2026-07-29T10:00:00Z' } }
      ];
      
      (mockGithubService.getCommits as Mock).mockResolvedValue(mockCommits);
      (mockGithubService.getContributors as Mock).mockResolvedValue(['dev1', 'dev2']);
      (mockGithubService.getTags as Mock).mockResolvedValue(['v1.0.0']);

      const res = await changelogService.getCommitStats('https://github.com/foo/bar');
      expect(res.totalCommits).toBe(3);
      expect(res.contributors).toBe(2);
      expect(res.tags).toBe(1);
      expect(res.commitsByType).toMatchObject({ feat: 2, fix: 1 });
      
      expect(cacheService.setChangelogStats).toHaveBeenCalled();
    });
  });

  describe('generateChangelog', () => {
    it('should build prompt and call stream API', async () => {
      const mockCommits = [
        { type: 'feat', sha: '123', message: 'Added a feature', subject: 'feat', author: {} }
      ];
      (mockGithubService.getCommits as Mock).mockResolvedValue(mockCommits);
      (mockGithubService.getTags as Mock).mockResolvedValue(['v1']);
      (mockAiService.generateChangelogStream as Mock).mockResolvedValue({ stream: 'stream-obj', provider: 'GEMINI' });

      const res = await changelogService.generateChangelog('https://github.com/f/b', { 
        includeTags: true, 
        format: 'keep-a-changelog',
        commitCount: 50,
        includeContributors: false,
        groupByType: true 
      });
      expect(mockAiService.generateChangelogStream).toHaveBeenCalled();
      expect('empty' in res).toBe(false);

if (!('empty' in res)) {
  expect(res.provider).toBe('GEMINI');
}
    });
  });

  describe('deleteChangelog', () => {
    it('should safely execute raw logic and delete', async () => {
      (prisma.changelog.count as Mock).mockResolvedValue(5);
      await changelogService.deleteChangelog('c-1', 'u-1');
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(prisma.changelog.delete).toHaveBeenCalledWith({ where: { id: 'c-1', userId: 'u-1' } });
    });
  });
});
