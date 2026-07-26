# Vernacular Technical Screening

> "Score the engineering, not the English — and prove it."

Full spec lives in [`PRD-vernacular-technical-screening.md`](./PRD-vernacular-technical-screening.md) (product) and
[`TRD-vernacular-technical-screening.md`](./TRD-vernacular-technical-screening.md) (engineering, Rev 2 — this is the
one to build from). This README covers setup only.

## Stack

- **Frontend** — Next.js 16 (App Router, TypeScript, Tailwind) → Vercel — [`/web`](./web)
- **Backend** — FastAPI → Railway — [`/api`](./api)
- **Voice pipeline** — Pipecat + Sarvam `SarvamSTTService` (`saaras:v3`) / `SarvamTTSService` (`bulbul:v3`)
- **Scoring** — Sarvam-30B, JSON mode, `temperature=0.1`, 3 runs per pass
- **Database** — Supabase Postgres + Storage bucket `turn-audio`. **Backend is the only writer** — the frontend
  talks to Supabase through the FastAPI REST contract only, never directly (TRD §1).
- **Writeback** — Beeceptor (mocked ATS) + Slack webhook

## Current state of this scaffold

This is the runnable skeleton, not a finished build. Both apps boot and serve their base routes with no external
credentials. What's implemented vs. stubbed:

| Area | Status |
|---|---|
| FastAPI app, CORS, REST contract (TRD §6), Pydantic models | Implemented |
| Aggregation formula (3-run median, TRD §3.4) and harness stats (TRD §7) | Implemented, pure functions |
| Sarvam REST calls — batch translate, scoring, fluency, TTS | Implemented (needs a real `SARVAM_API_KEY` to exercise) |
| Live Pipecat streaming pipeline + barge-in | Scaffolded interfaces only — see `TODO(pipeline dev)` in `api/app/routers/ws.py` and `api/app/services/pipecat_pipeline.py` |
| Next.js pages (`/screen/[sessionId]`, `/console`, `/harness`) and components | Implemented against the typed API/WS clients |
| Live mic capture → PCM streaming | Implemented (`lib/audio.ts`) but untested against a live WS backend |
| Three paired profiles' audio (PRD §10) | Not recorded — do this before 12:00 per the PRD |
| Deployment (Vercel/Railway) | Not done |

See `.vii/plan.md` for the full scope note on what this scaffolding pass covered.

## Setup

### 1. Supabase

1. Create a project, then run [`api/sql/schema.sql`](./api/sql/schema.sql) against it.
2. Create a private Storage bucket named `turn-audio`.
3. Copy the project URL and service role key.

### 2. `/api` (FastAPI)

```bash
cd api
python -m venv venv
./venv/Scripts/activate   # or `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env      # fill in SARVAM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, BEECEPTOR_URL, SLACK_WEBHOOK_URL
python sql/seed.py        # seeds the Backend Engineer rubric — do this before anything else touches the DB
uvicorn main:app --reload
```

Health check: `GET http://localhost:8000/health`

### 3. `/web` (Next.js)

```bash
cd web
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_BASE / NEXT_PUBLIC_WS_BASE at the running API
npm run dev
```

Open `http://localhost:3000`.

**Note (TRD §1):** WebSockets do not proxy through Vercel. `NEXT_PUBLIC_WS_BASE` must point straight at the
Railway/Render host, never at a Next.js route.

## Decisions still open (PRD §15 — close before 10:00 on demo day)

1. Vernacular demo language — Telugu vs. Hindi.
2. Who records the vernacular audio, and by when (needed before 12:00).
3. ~~Supabase or SQLite~~ — **decided: Supabase.**
4. Slack or Resend for delivery — TRD assumes Slack.

## What not to build

Real auth, multi-role rubrics, resume parsing, telephony, languages outside {en, hi, te}, a vector DB, custom VAD,
a second LLM provider, Supabase realtime, retry logic beyond TRD §3.2. Full list in TRD §12.
