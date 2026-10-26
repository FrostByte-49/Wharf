import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';

// Type definition for environment bindings
export type Bindings = {
  DATABASE_URL: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  ADMIN_IDS?: string;
  ENVIRONMENT?: string;
  FRONTEND_URL?: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_CALLBACK_URL?: string;
  ENCRYPTION_SECRET: string;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Bi-directional env sync for Cloudflare / Node / Vitest
app.use('*', async (c, next) => {
  if (typeof process === 'undefined') {
    (globalThis as any).process = { env: {} };
  }
  if (!process.env) {
    process.env = {};
  }
  if (c.env) {
    Object.assign(process.env, c.env);
  } else {
    c.env = process.env as any;
  }
  await next();
});

// Global Middleware
app.use('*', logger());
app.use('*', secureHeaders());

// Built once at module load and reused for every request. FRONTEND_URL is a
// per-request binding, so the origin check reads it from the context.
const STATIC_ALLOWED_ORIGINS = ['http://localhost:5173', 'https://trywharf.vercel.app'];

const corsMiddleware = cors({
  origin: (origin, c) => {
    if (STATIC_ALLOWED_ORIGINS.includes(origin)) return origin;
    const frontendUrl = c.env?.FRONTEND_URL;
    return frontendUrl && origin === frontendUrl ? origin : null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});

app.use('*', corsMiddleware);

import { authRoutes } from './routes/auth.routes';
import { healthRoutes } from './routes/health.routes';
import { changelogRoutes } from './routes/changelog.routes';
import { userRoutes } from './routes/user.routes';
import { repoRoutes } from './routes/repo.routes';
import { generateRoutes } from './routes/generate.routes';
import { chatRoutes } from './routes/chat.routes';
import { adminRoutes } from './routes/admin.routes';
import { profileRoutes } from './routes/profile.routes';

// Mount Controllers
app.route('/api/auth', authRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/changelog', changelogRoutes);
app.route('/api/user', userRoutes);
app.route('/api/repo', repoRoutes);
app.route('/api/generate', generateRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/profile', profileRoutes);

app.onError((err, c) => {
  console.error("APP ONERROR:", err.stack);
  console.log("ONERROR ROUTE:", c.req.url);
  return c.text('Internal Server Error', 500);
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (c) => {
  return c.text('Wharf Cloudflare Worker API is running...');
});

export default app;
