import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import type { Mock } from "vitest";
import { generateReadme, getHistory, getHistoryById, deleteHistoryItem } from '../../../src/controllers/generate.controller';
import { cacheService } from '../../../src/services/cache.service';
import { RepoService } from '../../../src/services/repo.service';
import { AiService } from '../../../src/services/ai.service';
import { createMockContext } from '../test-utils';

let streamBuffer = '';

vi.mock('hono/streaming', () => {
  const mockStreamFunc = vi.fn().mockImplementation(async (c: any, cb: any) => {
    const stream = {
      write: vi.fn().mockImplementation((chunk: any) => {
        streamBuffer += chunk;
        return Promise.resolve();
      })
    };
    await cb(stream);
    return { _isHonoResponse: true, streamed: true, buffer: streamBuffer };
  });
  return { streamText: mockStreamFunc, stream: mockStreamFunc };
});

vi.mock('../../../src/services/cache.service');
vi.mock('../../../src/services/repo.service');
vi.mock('../../../src/services/ai.service');
vi.mock('../../../src/utils/logger', () => ({
  loggerService: { stepStart: vi.fn(), stepEnd: vi.fn(), info: vi.fn(), error: vi.fn(), cacheHit: vi.fn(), warn: vi.fn() },
  saveRequestLog: vi.fn(),
}));

vi.mock('../../../src/db', () => ({
  __esModule: true,
  default: {},
  getPrisma: vi.fn().mockReturnValue({
    user: { findUnique: vi.fn() },
    repository: { upsert: vi.fn() },
    generation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    $executeRaw: vi.fn()
  })
}));

describe('GenerateController', () => {
  let mockEnv: any;
  let prismaObj: any;

  beforeEach(async () => {
    streamBuffer = '';
    vi.clearAllMocks();
    mockEnv = { DATABASE_URL: 'postgres://x', ENCRYPTION_SECRET: 'secret' };
    prismaObj = (await import('../../../src/db')).getPrisma('');
  });

  describe('generateReadme', () => {
    it('should validate inputs', async () => {
      const c = createMockContext({ body: {} }, mockEnv, { userId: 'u-1' });
      await generateReadme(c);
      
      expect(c.json).toHaveBeenCalledWith({
        success: false, error: 'repoUrl, tone, and sections are required fields'
      }, 400);
    });

    it('should use cache if available and stream mock data', async () => {
      const c = createMockContext({
        body: { repoUrl: 'https://github.com/foo/bar', tone: 'tech', sections: ['s1'] }
      }, mockEnv, { userId: 'u-1' });
      
      (cacheService.getReadme as Mock).mockResolvedValue('cached stuff');

      const res = await generateReadme(c);
      
      expect(streamBuffer).toContain('cached stuff');
      expect(streamBuffer).toContain('data: [DONE]\n\n');
      expect(RepoService.prototype.analyzeRepo).not.toHaveBeenCalled();
    });

    it('should fetch new analysis and save to DB on cache miss', async () => {
      const c = createMockContext({
        body: { repoUrl: 'https://github.com/foo/bar', tone: 'tech', sections: ['s1'] }
      }, mockEnv, { userId: 'u-1' });

      (cacheService.getReadme as Mock).mockResolvedValue(null);
      (RepoService.prototype.analyzeRepo as Mock).mockResolvedValue({ meta: { name: 'repo' } });
      
      (AiService.prototype.generateReadmeStream as Mock).mockImplementation(async (ctx: any, t: any, s: any, u: any, cb: any) => {
        cb('new chunk');
        return { text: 'new chunk', provider: 'GEMINI' };
      });

      (prismaObj.repository.upsert as Mock).mockResolvedValue({ id: 'repo-1' });
      (prismaObj.generation.create as Mock).mockResolvedValue({ id: 'gen-1' });

      await generateReadme(c);

      expect(streamBuffer).toContain('new chunk');
      expect(cacheService.setReadme).toHaveBeenCalled();
      expect(prismaObj.repository.upsert).toHaveBeenCalled();
      expect(prismaObj.generation.create).toHaveBeenCalled();
      expect(prismaObj.$executeRaw).toHaveBeenCalled();
    });

    it('passes an ephemeral header override without reading a user key from the database', async () => {
      const c = createMockContext({
        body: { repoUrl: 'https://github.com/foo/bar', tone: 'tech', sections: ['s1'] },
        headers: { 'X-BYOK-OpenAI': 'request-only-secret' },
      }, mockEnv);

      (cacheService.getReadme as Mock).mockResolvedValue(null);
      (RepoService.prototype.analyzeRepo as Mock).mockResolvedValue({ meta: { name: 'repo' } });
      (AiService.prototype.generateReadmeStream as Mock).mockResolvedValue({ text: 'generated', provider: 'OPENAI' });

      await generateReadme(c);

      expect(AiService.prototype.generateReadmeStream).toHaveBeenCalledWith(
        expect.anything(),
        'tech',
        ['s1'],
        undefined,
        expect.any(Function),
        { provider: 'OPENAI', key: 'request-only-secret' },
      );
      expect(prismaObj.user.findUnique).not.toHaveBeenCalled();
      expect(prismaObj.repository.upsert).not.toHaveBeenCalled();
      expect(prismaObj.generation.create).not.toHaveBeenCalled();
    });
  });

  describe('History endpoints', () => {
    it('getHistory should return paginated data', async () => {
      const c = createMockContext({ query: {} }, mockEnv, { userId: 'u-1' });
      (prismaObj.generation.findMany as Mock).mockResolvedValue([{ id: 'g1' }]);
      
      await getHistory(c);
      expect(prismaObj.generation.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 50 }));
      expect(c.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'g1' }] });
    });

    it('deleteHistoryItem should sync high water mark and delete', async () => {
      const c = createMockContext({ params: { id: 'g1' } }, mockEnv, { userId: 'u-1' });
      (prismaObj.generation.findUnique as Mock).mockResolvedValue({ repository: { userId: 'u-1' } });
      
      await deleteHistoryItem(c);
      
      expect(prismaObj.$executeRaw).toHaveBeenCalled();
      expect(prismaObj.generation.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
      expect(c.json).toHaveBeenCalledWith({ success: true, message: 'Deleted successfully' });
    });
  });
});
