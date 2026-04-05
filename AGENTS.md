# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Manthan OS is an AI-native Managed Marketplace for Indian Media & Entertainment. It has two services:

| Service | Tech | Port | Start command |
|---------|------|------|---------------|
| Next.js app (frontend + API) | Next.js 15, React 19, TypeScript | 3000 | `npm run dev` |
| Python worker (PDF extraction + embeddings) | Flask, pdfplumber, voyageai | 8000 | `cd worker && python3 server.py` (needs env vars, see below) |

### Running Services

**Next.js dev server:** `npm run dev` (uses Turbopack). Reads env from `.env.local`.

**Python worker:** Requires these env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VOYAGE_API_KEY`, `WORKER_SECRET`, `PORT`. Run with:
```
cd worker && SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... VOYAGE_API_KEY=... WORKER_SECRET=... PORT=8000 python3 server.py
```

### Lint / Build / Test

- **Lint:** `npx eslint .` — the codebase has pre-existing lint errors (6 errors, 13 warnings). The `@typescript-eslint/no-explicit-any` error in `projects/page.tsx` and `prefer-const` in `middleware.ts` cause `next build` to fail.
- **Build:** `npm run build` — currently fails due to the pre-existing lint errors above (Next.js treats ESLint errors as build failures).
- **Tests:** No automated test suite exists in this repository.

### Environment Variables

The app requires a `.env.local` file (gitignored). In development mode, missing required env vars produce console warnings but do not crash the server. Required vars for full functionality: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VOYAGE_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `RAILWAY_WORKER_URL`, `WORKER_SECRET`. Optional: `OPENAI_API_KEY`, `SEGMIND_API_KEY`, `PIXELBIN_API_KEY`, `PIXELBIN_ACCESS_TOKEN`, `PIXELBIN_ORG_ID`.

### Key Gotchas

- The lockfile is `package-lock.json` — use `npm` (not pnpm/yarn).
- Python worker dependencies install to user site-packages (`~/.local/`); `flask` and `gunicorn` binaries land in `~/.local/bin/` which may not be on PATH.
- The app uses Supabase for auth, so most dashboard pages redirect to `/login` without valid Supabase credentials.
- Inngest dev server (`npx inngest-cli dev`) is needed for async document processing pipelines but is not required for basic app startup.
