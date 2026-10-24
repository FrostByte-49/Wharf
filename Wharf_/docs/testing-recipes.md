# Developer Testing Recipes & Manual QA Walkthrough Guide 

This guide provides step-by-step testing recipes for contributors to test frontend components, Cloudflare Worker backend routes, and authentication flows locally without requiring live GitHub OAuth credentials or paid third-party LLM API keys.

<br />

## Table of Contents

- [Running Unit & Integration Test Suites](#running-unit--integration-test-suites)
  - [Backend Tests (`Wharf_/backend`)](#backend-tests-wharf_backend)
  - [Frontend Tests (`Wharf_/frontend`)](#frontend-tests-wharf_frontend)
- [Mocking GitHub OAuth & Authenticated Routes](#mocking-github-oauth--authenticated-routes)
- [Running Frontend End-to-End (E2E) Tests](#running-frontend-end-to-end-e2e-tests)
- [Testing LLM & AI Endpoints Offline (Zero-Cost QA)](#testing-llm--ai-endpoints-offline-zero-cost-qa)
- [Pre-PR Quality Checklist](#pre-pr-quality-checklist)

<br />

## Running Unit & Integration Test Suites

Wharf uses **Vitest** for both the Cloudflare Worker backend and the React frontend.

### Backend Tests (`Wharf_/backend`)

The backend runs on Cloudflare Workers pool simulation via `@cloudflare/vitest-pool-workers`.

```bash
cd Wharf_/backend

# Run all test suites once
npm run test

# Run tests in watch mode during development
npx vitest

# Run a specific test file
npx vitest test/auth.test.ts
```

### Frontend Tests (`Wharf_/frontend`)

The frontend test scripts are configured in `Wharf_/frontend/package.json`:

```bash
cd Wharf_/frontend

# Run all unit and component tests
npm run test

# Run Vitest in interactive watch mode
npm run test:watch

# Launch Vitest visual browser UI (inspect test trees and execution times)
npm run test:ui

# Generate test coverage report
npm run test:cov
```

<br />

## Mocking GitHub OAuth & Authenticated Routes

You do **not** need to register a live GitHub OAuth application to develop and test protected API endpoints locally.

### Step 1: Configure `.dev.vars` with a Local Secret

In `Wharf_/backend/.dev.vars`, ensure you have a standard test JWT secret:

```env
JWT_SECRET="local_dev_jwt_secret_min_32_characters_long_12345"
FRONTEND_URL="http://localhost:5173"
PORT=8787
```

### Step 2: Generate a Mock Bearer Token

You can generate a test token using Node.js one-liner from your terminal:

```bash
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({ userId: 'dev-user-001', githubId: 12345, username: 'test-developer', role: 'USER' }, 'local_dev_jwt_secret_min_32_characters_long_12345', { expiresIn: '7d' }))"
```

### Step 3: Test Protected Endpoints via cURL

Use the generated token in the `Authorization` header:

```bash
curl -X GET http://localhost:8787/api/user/me \
  -H "Authorization: Bearer <COPIED_TOKEN_HERE>" \
  -H "Content-Type: application/json"
```

### Step 4: Mocking Frontend Auth Session

If developing frontend components that depend on `useAuthStore` or user session state:

1. Open DevTools in your browser (`http://localhost:5173`).
2. Set the mock token in `localStorage`:
   ```javascript
   localStorage.setItem('auth_token', '<COPIED_TOKEN_HERE>');
   ```
3. Refresh the page to render protected routes in an authenticated state.

<br />

## Running Frontend End-to-End (E2E) Tests

Wharf uses **Playwright** for full end-to-end user journey validation.

### Setup Playwright Browsers (First Time Only)

```bash
cd Wharf_/frontend
npx playwright install --with-deps
```

### Running Tests

```bash
cd Wharf_/frontend

# Run all E2E tests headlessly
npm run test:e2e

# Run Playwright Interactive UI Mode (Recommended for debugging)
npm run test:e2e:ui

# Run tests in a specific browser
npx playwright test --project=chromium

# Debug tests with Playwright Inspector step-by-step
npx playwright test --debug
```

<br />

## Testing LLM & AI Endpoints Offline (Zero-Cost QA)

To test features that generate READMEs, changelogs, or documentation without consuming paid LLM API quotas:

### Option A: Free Tier Keys (Gemini / Groq)

Instead of paid OpenAI / Anthropic credits, you can use generous free-tier API keys:
- **Google Gemini**: Get a free API key at [Google AI Studio](https://aistudio.google.com/) and assign to `SEED_GEMINI_KEY` in `Wharf_/backend/.dev.vars`.
- **Groq Cloud**: Get a free fast inference key at [Groq Console](https://console.groq.com/) and assign to `SEED_GROQ_KEY_1` in `Wharf_/backend/.dev.vars`.

```env
# In Wharf_/backend/.dev.vars
SEED_GEMINI_KEY="AIzaSy..."
SEED_GROQ_KEY_1="gsk_..."
```

### Option B: Local Mock Mode / Unit Stubs

When writing unit or integration tests for generator functions, mock the Vercel AI SDK streams:

```typescript
import { vi } from 'vitest';

// Mock streamText / generateText from the 'ai' package
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn().mockResolvedValue({
      text: '## Mock Generated Documentation\n\nThis is a mock response for local testing.',
    }),
  };
});
```

<br />

## Pre-PR Quality Checklist

Before submitting changes, run this checklist:

```bash
# 1. Verify Backend Types & Tests
cd Wharf_/backend
npx tsc --noEmit
npm run test

# 2. Verify Frontend Types & Linting
cd ../frontend
npx tsc --noEmit
npm run lint
npm run test
```
