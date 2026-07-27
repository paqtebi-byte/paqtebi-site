# Paqtebi

Georgian news platform built with React 19, TypeScript, Vite, Supabase and Vercel serverless functions.

## Requirements

- Node.js 22 LTS
- npm
- A Supabase project
- A Vercel project for production deployment
- Cloudinary and Gemini credentials for their respective server-side features

## Local setup

1. Install the locked dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and provide the required values. Never commit `.env.local`.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Environment variables

Only these two variables are exposed to browser code:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

All other values are server-only secrets and must not use the `VITE_` prefix:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SECRET_CODE`
- `ADMIN_SESSION_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The Supabase Edge Function also requires `MEDIA_CLEANUP_WEBHOOK_SECRET`. Its matching database Vault value must be updated at the same time.

## Verification

```bash
npm test
npm run typecheck
npm run build
```

The test suite covers admin sessions, analytics abuse protection, comment authorization, media cleanup, RLS, request stability and client-state synchronization.

## Deployment

The production Vercel project deploys automatically from the GitHub `main` branch. Environment variables must be configured for both Production and Preview where needed. After a secret changes, create a new deployment so the running functions receive it.

Supabase schema changes live in `supabase/migrations`. Edge Function code lives in `supabase/functions` and is deployed separately from Vercel.

## Project structure

- `api/` — Vercel serverless endpoints
- `components/` — React UI
- `context/` and `hooks/` — shared client state
- `services/` — Supabase and server API access
- `server/` — shared server-only helpers
- `supabase/` — migrations and Edge Functions
- `tests/` — Node test suite
- `utils/` — reusable validation, security and stability helpers
- `scripts/` and root `check_*.cjs` files — credential-free Supabase diagnostics

## Security notes

- Never expose service-role, Cloudinary, Gemini or admin secrets through `VITE_*` variables.
- Admin sessions use signed HttpOnly cookies.
- Article HTML is sanitized before rendering.
- Run `npm audit` when dependencies change and review findings in the context of the deployed architecture before applying breaking upgrades.

### Current audit note

As of 2026-07-27, npm reports the React Router RSC/server-actions CSRF advisory against `react-router-dom@7.18.1`. Paqtebi uses declarative `BrowserRouter` SPA mode and does not use React Server Components, loaders, actions or server actions, so the affected execution path is not present. A forced major upgrade is intentionally deferred until a compatible patched release is available.
