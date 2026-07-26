# Plan — Vernacular Technical Screening

Source: `PRD-vernacular-technical-screening.md` + `TRD-vernacular-technical-screening.md` (Rev 2). Tech stack is locked by TRD §12/§1 — not re-litigated here.

## Stack (decided, not up for debate)
- **Frontend:** Next.js (App Router, TS, Tailwind) on Vercel — `/web`
- **Backend:** FastAPI on Railway — `/api`
- **Voice pipeline:** Pipecat + `SarvamSTTService` (`saaras:v3`) / `SarvamTTSService` (`bulbul:v3`)
- **Scoring LLM:** Sarvam-30B, JSON mode, temp 0.1
- **DB:** Supabase Postgres + Storage bucket `turn-audio` (backend-only writer)
- **Writeback:** Beeceptor (mocked ATS) + Slack webhook

## Architecture contract
- Frontend never writes to Supabase — REST + WS through FastAPI only (TRD §1).
- WS connects directly to the Railway host, not proxied through Vercel.
- CORS must be added on the first FastAPI commit.
- One STT WS stream per session (`mode=transcribe`); English gloss comes from an async batch `mode=translate` call per turn, chunked on VAD boundaries (TRD §3.1).
- Competence scoring and fluency scoring are two separate LLM calls with no shared context (TRD §3.5).
- Harness runner is serial with a 1.2s sleep between calls, single retry on 429 (TRD §3.8).

## This scaffold's scope
This pass sets up the runnable skeleton both devs build on top of — it does not wire real Sarvam credentials, deploy, or implement live mic capture/Pipecat streaming logic end-to-end. It gives:
1. `/api` — FastAPI app, CORS, Pydantic models matching TRD §6 REST contract, routers with stub/TODO logic, WS route matching the §4 protocol, service modules (`sarvam_stt`, `sarvam_tts`, `sarvam_llm`, `pipecat_pipeline`, `harness_runner`, `aggregate`, `stats`) with the aggregation/stat formulas from §3.4 and §7 implemented (pure functions, testable without API keys), Supabase client wrapper.
2. SQL schema (TRD §5) verbatim + `seed.py` for the Backend Engineer rubric (PRD §8).
3. `/web` — Next.js skeleton with the three routes (`/screen/[sessionId]`, `/console`, `/harness`) and component stubs per TRD §9, typed `lib/api.ts` matching the same REST contract, `lib/ws.ts` matching the §4 event protocol.
4. Root README with setup/run instructions and the four open decisions from PRD §15 called out as TODOs.

## Explicitly deferred to the two devs during the build window
- Real `SARVAM_API_KEY` / Supabase / Beeceptor / Slack credentials.
- Live Pipecat barge-in wiring and mic capture in the browser.
- The three paired profiles' actual audio recordings (PRD §10).
- Deployment to Vercel/Railway and the public URLs.
- Harness batch run against real sessions.

## Gate
Both `/api` (uvicorn) and `/web` (next dev) must boot locally and serve their `/health` / `/` routes before this is committed.
