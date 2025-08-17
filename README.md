# Manthan Creator Suite v0.2

Dual-path Creator Suite:
- Guided Path: Idea → Outline → Script → Pitch Deck
- Accelerated Path: Upload Script → Auto Package → Pitch Deck

Stack: Next.js 14 (App Router) + Tailwind + shadcn/ui + Firebase Auth + PostHog
API: FastAPI on Cloud Run (OpenAI GPT-5 for generation; optional image generation)
Storage: Firestore (drafts, decks, tokens), Cloud Storage (assets)
Region: asia-south1 (Mumbai)

## Quick start

### 0) Prereqs
- Node 20+ and pnpm (`npm i -g pnpm`)
- Python 3.11+
- GCP project: `project-manthan-468609`
- Firestore + Storage enabled
- Firebase Web App created for Auth
- OpenAI API key with access to GPT-5 (env var at deploy)

### 1) Install
```bash
pnpm i
```

### 2) Dev – API
```bash
cd apps/api
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8081 --reload
```

### 3) Dev – Web
```bash
cd apps/web
cp .env.example .env.local  # fill values
pnpm dev
```

### 4) Build & Deploy (Cloud Run)
See `infra/cloudbuild-backend.yaml` and `infra/cloudbuild-frontend.yaml` for Cloud Build.
- Create repositories `manthan-repo` (Artifact Registry) and Cloud Build triggers.
- Set **substitutions** (see YAML headers).

### 5) Plans (monetization later)
Monetization endpoints and UI are stubbed but disabled by default.

---

## App overview

- apps/web: Next.js app with:
  - Guided Wizard and Accelerated Ingest
  - Deck Builder (PDF/Docx/Web Pitch)
  - Firebase Auth (Google + Email OTP)
  - PostHog analytics
  - Minimal Outreach Pipeline view

- apps/api: FastAPI with routes:
  - /gen/idea, /gen/outline, /gen/script, /gen/deck
  - /ingest/upload (accelerated path)
  - /export/pdf, /export/docx, /export/web-pitch
  - /images/concepts (toggled by `ENABLE_IMAGE_GEN`)

- infra: Cloud Build YAMLs, Dockerfiles, Firestore rules suggestion
