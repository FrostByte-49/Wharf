import { describe, expect, it } from 'vitest';
import app from '../../src/index';

describe('ephemeral BYOK CORS preflight', () => {
  it('allows all primary provider headers', async () => {
    const response = await app.request('/api/generate/readme', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'X-BYOK-Gemini,X-BYOK-OpenAI,X-BYOK-Groq,X-BYOK-Anthropic',
      },
    }, { FRONTEND_URL: 'http://localhost:5173' } as any);

    expect(response.status).toBe(204);
    const allowed = response.headers.get('Access-Control-Allow-Headers') || '';
    expect(allowed).toContain('X-BYOK-Gemini');
    expect(allowed).toContain('X-BYOK-OpenAI');
    expect(allowed).toContain('X-BYOK-Groq');
    expect(allowed).toContain('X-BYOK-Anthropic');
  });
});
