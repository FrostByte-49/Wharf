import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cors } from 'hono/cors';
import app from '../../src/index';

vi.mock('hono/cors', async (importOriginal) => {
  const actual = await importOriginal<typeof import('hono/cors')>();
  return { ...actual, cors: vi.fn(actual.cors) };
});

vi.mock('../../src/db', () => ({
  __esModule: true,
  default: {},
  getPrisma: vi.fn().mockReturnValue({}),
}));

// cors() should only have been called while src/index.ts was being imported
const corsCallsAtLoad = vi.mocked(cors).mock.calls.length;

describe('CORS middleware', () => {
  const savedFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    // the env sync middleware in src/index.ts copies bindings into process.env
    process.env.FRONTEND_URL = savedFrontendUrl;
  });

  afterEach(() => {
    process.env.FRONTEND_URL = savedFrontendUrl;
  });

  it('creates the cors middleware once at module load, not per request', async () => {
    expect(corsCallsAtLoad).toBe(1);

    const before = vi.mocked(cors).mock.calls.length;
    for (let i = 0; i < 3; i++) {
      await app.request('/health', { headers: { Origin: 'http://localhost:5173' } }, {});
    }
    expect(vi.mocked(cors).mock.calls.length).toBe(before);
  });

  it.each(['http://localhost:5173', 'https://trywharf.vercel.app'])(
    'allows the hardcoded origin %s with credentials',
    async (origin) => {
      const res = await app.request('/health', { headers: { Origin: origin } }, {});
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    }
  );

  it('allows the origin set in FRONTEND_URL', async () => {
    const res = await app.request(
      '/health',
      { headers: { Origin: 'https://staging.example.com' } },
      { FRONTEND_URL: 'https://staging.example.com' }
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://staging.example.com');
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('does not allow a FRONTEND_URL origin when the binding is not set', async () => {
    const res = await app.request(
      '/health',
      { headers: { Origin: 'https://staging.example.com' } },
      {}
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('does not set Allow-Origin for an unknown origin', async () => {
    const res = await app.request(
      '/health',
      { headers: { Origin: 'https://evil.example.com' } },
      { FRONTEND_URL: 'https://staging.example.com' }
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('does not set Allow-Origin when there is no Origin header and no FRONTEND_URL', async () => {
    const res = await app.request('/health', {}, {});
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('answers the preflight with the same methods and headers as before', async () => {
    const res = await app.request(
      '/health',
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization',
        },
      },
      {}
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,PUT,PATCH,DELETE,OPTIONS');
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type,Authorization');
  });
});
