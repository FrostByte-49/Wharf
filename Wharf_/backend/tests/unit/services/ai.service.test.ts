import type { Mock } from "vitest";
import { AiService } from '../../../src/services/ai.service';
import { KeyRouterService } from '../../../src/services/keyRouter.service';
import { GoogleGenAI } from '@google/genai';

vi.mock('../../../src/services/keyRouter.service');
vi.mock('../../../src/db', () => ({
  __esModule: true,
  default: {},
  getPrisma: vi.fn().mockReturnValue({})
}));
vi.mock('../../../src/utils/logger', () => ({
  loggerService: {
    stepStart: vi.fn(),
    stepEnd: vi.fn(),
    providerSelected: vi.fn(),
    providerStarted: vi.fn(),
    providerCompleted: vi.fn(),
    providerFallback: vi.fn(),
    providerFailed: vi.fn(),
  }
}));

// We Only Need To Deeply Test One Provider Fallback Path To Prove The Logic
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function() {
    return {
      models: {
        generateContentStream: vi.fn().mockResolvedValue([
          { text: 'chunk1' }, { text: 'chunk2' }
        ])
      }
    };
  })
}));

const mockRepoContext = {
  meta: { name: 'repo', owner: 'owner', description: 'desc', language: 'ts', topics: [], stars: 10, license: 'MIT', defaultBranch: 'main' },
  frameworks: [],
  commands: { install: '', run: '' },
  treePreview: '',
  keyFiles: {},
};

describe('AiService', () => {
  let aiService: AiService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    aiService = new AiService('postgres://test');
  });

  describe('generateReadmeStream', () => {
    it('should throw if no keys exist at all', async () => {
      (KeyRouterService.prototype.getBestAvailableKey as Mock).mockResolvedValue(null);
      
      await expect(
        aiService.generateReadmeStream({} as any, 'technical', [])
      ).rejects.toThrow('No API Keys Available');
    });

    it('should use system GEMINI key if user has no keys', async () => {
      (KeyRouterService.prototype.getBestAvailableKey as Mock).mockResolvedValue(
        { id: 's1', key: 'sys-gem', provider: 'GEMINI', isSystem: true }
      );

      const mockContext = { 
        meta: { name: 'repo', owner: 'owner', description: 'desc', language: 'ts', topics: [], stars: 10, license: 'MIT', defaultBranch: 'main' },
        frameworks: [],
        commands: { install: '', run: '' },
        treePreview: '',
        keyFiles: {}
      };

      let chunks = '';
      const result = await aiService.generateReadmeStream(mockContext as any, 'technical', [], 'user-1', (t) => {
        chunks += t;
      });

      expect(result.provider).toBe('GEMINI');
      expect(result.text).toBe('chunk1chunk2');
      expect(chunks).toBe('chunk1chunk2');
      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'sys-gem' });
    });

    it('uses an ephemeral key before consulting the database key router', async () => {
      const result = await aiService.generateReadmeStream(
        mockRepoContext as any,
        'technical',
        [],
        undefined,
        undefined,
        { provider: 'GEMINI', key: 'request-gemini-key' },
      );

      expect(result.provider).toBe('GEMINI');
      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'request-gemini-key' });
      expect(KeyRouterService.prototype.getBestAvailableKey).not.toHaveBeenCalled();
    });

    it('does not mark request-scoped keys exhausted in the database', async () => {
      (GoogleGenAI as Mock).mockImplementationOnce(function() {
        return { models: { generateContentStream: vi.fn().mockRejectedValue({ status: 429 }) } };
      });

      await expect(aiService.generateReadmeStream(
        mockRepoContext as any,
        'technical',
        [],
        undefined,
        undefined,
        { provider: 'GEMINI', key: 'bad-request-key' },
      )).rejects.toMatchObject({ status: 429 });

      expect(KeyRouterService.prototype.markAsExhausted).not.toHaveBeenCalled();
    });

    it('should fallback to NEXT_AVAILABLE if exhaustion error occurs', async () => {
      (KeyRouterService.prototype.getBestAvailableKey as Mock)
        .mockResolvedValueOnce({ id: 's1', key: 'sys-fail', provider: 'GEMINI', isSystem: true })
        .mockResolvedValueOnce({ id: 's2', key: 'sys-win', provider: 'GEMINI', isSystem: true });

      // First Gen Fails With 429
      const mockFailModel = { generateContentStream: vi.fn().mockRejectedValue({ status: 429 }) };
      const mockWinModel = { generateContentStream: vi.fn().mockResolvedValue([{ text: 'win' }]) };

      (GoogleGenAI as Mock)
        .mockImplementationOnce(function() { return { models: mockFailModel }; })
        .mockImplementationOnce(function() { return { models: mockWinModel }; });

      const mockContext = { 
        meta: { name: 'repo', owner: 'owner', description: 'desc', language: 'ts', topics: [], stars: 10, license: 'MIT', defaultBranch: 'main' },
        frameworks: [],
        commands: { install: '', run: '' },
        treePreview: '',
        keyFiles: {}
      };
      const result = await aiService.generateReadmeStream(mockContext as any, 'technical', []);
      expect(result.text).toBe('win');
      
      // Verified Exhaustion Mark
      expect(KeyRouterService.prototype.markAsExhausted).toHaveBeenCalledWith('s1', true);
    });
  });
});
