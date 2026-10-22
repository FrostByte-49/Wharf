# Developer Testing Recipes & Manual QA Walkthrough Guide 🧪

This guide provides step-by-step testing recipes for contributors to test frontend components, backend edge worker routes, and authentication flows locally without requiring live GitHub OAuth credentials or paid third-party LLM API keys.

---

## Table of Contents

1. [Running Unit & Integration Test Suites](#1-running-unit--integration-test-suites)
2. [Mocking GitHub OAuth & Authenticated Routes](#2-mocking-github-oauth--authenticated-routes)
3. [Running Frontend End-to-End (E2E) Tests](#3-running-frontend-end-to-end-e2e-tests)
4. [Testing LLM & AI Endpoints Offline (Zero-Cost QA)](#4-testing-llm--ai-endpoints-offline-zero-cost-qa)
5. [Pre-PR Quality Checklist](#5-pre-pr-quality-checklist)

---

## 1. Running Unit & Integration Test Suites

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

Frontend Tests (Wharf_/frontend)

cd Wharf_/frontend

# Run all unit and component tests
npm run test

# Run Vitest in interactive terminal watch mode
npm run test:watch

# Launch Vitest visual browser UI (inspect test trees and execution times)
npm run test:ui

# Generate test coverage report
npm run test:cov

2. Mocking GitHub OAuth & Authenticated Routes
You do not need to register a live GitHub OAuth application to develop and test protected API endpoints locally.

Step 1: Configure .dev.vars with a Local Secret
In Wharf_/backend/.dev.vars:

env
JWT_SECRET="local_dev_jwt_secret_min_32_characters_long_12345"
FRONTEND_URL="http://localhost:5173"
PORT=8787
Step 2: Generate a Mock Bearer Token
Run this one-liner in your terminal:

bash
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({ userId: 'dev-user-001', githubId: 12345, username: 'test-developer', role: 'USER' }, 'local_dev_jwt_secret_min_32_characters_long_12345', { expiresIn: '7d' }))"
Step 3: Test Protected Endpoints via cURL
bash
curl -X GET http://localhost:8787/api/user/me \
  -H "Authorization: Bearer <COPIED_TOKEN_HERE>" \
  -H "Content-Type: application/json"
3. Running Frontend End-to-End (E2E) Tests
bash
cd Wharf_/frontend
npm run test:e2e
npm run test:e2e:ui
4. Testing LLM & AI Endpoints Offline
Assign free-tier keys in Wharf_/backend/.dev.vars:

env
SEED_GEMINI_KEY="AIzaSy..."
SEED_GROQ_KEY_1="gsk_..."
5. Pre-PR Quality Checklist
bash
cd Wharf_/backend
npx tsc --noEmit
npm run test
cd ../frontend
npx tsc --noEmit
npm run lint
npm run test


