# TRD — Vernacular Technical Screening
### Companion to the PRD. This is what you open at 10:00 and start typing from.
**Rev 2** — corrects DB write ownership, the dual-STT concurrency problem, the `run_index` collision, and adds the fluency-scoring path and harness formulas that Rev 1 left undefined.

---

## 1. System architecture

```
┌─────────────────────┐   REST (all reads + writes)  ┌──────────────────────┐
│  Next.js (Vercel)   │ ───────────────────────────▶ │  FastAPI (Railway)    │
│  - /screen/[id]     │ ◀─────────────────────────── │  Dev B                │
│  - /console         │                               │  - Pipecat pipeline   │
│  - /harness         │   WS: audio + events          │  - Scoring service    │
│  Dev A              │ ◀───────direct, not ─────────▶│  - Fluency scorer     │
└─────────────────────┘      via Vercel               │  - Harness runner     │
                                                       └──────────┬────────────┘
                                                                  │
                                    ┌─────────────────────────────┼──────────────┐
                                    ▼                             ▼              ▼
                          ┌──────────────────┐        ┌──────────────┐  ┌──────────────┐
                          │ Supabase (PG +   │        │  Sarvam API   │  │  Beeceptor    │
                          │ Storage bucket)  │        │  Saaras v3    │  │  + Slack      │
                          │ BACKEND ONLY     │        │  Sarvam-30B   │  │               │
                          └──────────────────┘        │  Bulbul v3    │  └──────────────┘
                                                       └──────────────┘
```

**Write ownership: the backend owns the database. The frontend never writes to Supabase.** Rev 1's diagram had both tiers touching Postgres, which invites two writers racing on the same session row during a live screen. Dev A reads and writes exclusively through the REST contracts in §6. If you want the console to feel live, poll `/sessions` every 2s — do not reach for Supabase realtime subscriptions today.

**Two gotchas that cost 20 minutes each if you meet them cold:**
- **WebSockets do not proxy through Vercel.** The candidate page must open its WS straight to the Railway/Render host (`NEXT_PUBLIC_WS_BASE`), not to a Next.js route. Don't try to tunnel it.
- **CORS.** Add `CORSMiddleware` with your Vercel origin on the very first FastAPI commit, before you write any endpoint. It will bite in Hour 1 otherwise.

**Host choice:** Railway over Render free tier. Render free spins down after ~15 min idle with a ~50s cold start — which is exactly what happens between your last test and the judges walking over. If you're on Render free anyway, run a cron ping every 10 minutes from Hour 4 onward.

---

## 2. Environment setup (first 20 minutes, both devs in parallel)

```bash
mkdir vernacular-screen && cd vernacular-screen
mkdir web api
```

**`/api` (Dev B)**
```bash
cd api
python3 -m venv venv && source venv/bin/activate
pip install fastapi uvicorn "pipecat-ai[sarvam]" python-dotenv supabase websockets numpy
```

`.env`:
```
SARVAM_API_KEY=<key-1>
SARVAM_API_KEY_BACKUP=<key-2>
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SUPABASE_BUCKET=turn-audio
BEECEPTOR_URL=https://<endpoint>.free.beeceptor.com
SLACK_WEBHOOK_URL=...
```

**`/web` (Dev A)**
```bash
cd web
npx create-next-app@latest . --typescript --app --tailwind
npm install @supabase/supabase-js
```

`.env.local`:
```
NEXT_PUBLIC_API_BASE=https://<railway-app>.up.railway.app
NEXT_PUBLIC_WS_BASE=wss://<railway-app>.up.railway.app
```

**Create the Supabase Storage bucket now** (`turn-audio`, private). Rev 1's schema referenced `audio_url` with nowhere to put the file.

**Deploy both skeletons before writing real logic.** Empty `/health` endpoints are enough. Getting public URLs live in Hour 1 is the single highest-value 10 minutes of the day.

---

## 3. Sarvam API — exact call shapes

### 3.1 The two-transcript problem (read this before coding the pipeline)

You need two representations of every answer: the **original-language text** (audit evidence, shown to the recruiter) and the **English gloss** (what the scorer reads). Rev 1 said to run two streaming calls. Don't — two concurrent WS connections per session doubles your rate-limit burn against a per-account ceiling, and you'll feel it during the harness batch.

**Do this instead:**

1. **Stream `mode=transcribe`** for the live experience — interim transcript on screen, VAD signals for turn-taking. One WS connection per session.
2. **Buffer each turn's audio** in memory as it streams; on `UserStoppedSpeaking`, write the segment to Supabase Storage.
3. **Fire a batch `mode=translate`** call on that saved segment, asynchronously, the moment the turn ends.

Step 3 runs concurrently with follow-up-question generation, so it costs nothing in perceived latency — the candidate is listening to the next question while the gloss resolves. Persist the turn row once both land.

**Chunking:** the batch endpoint caps at **30 seconds**. A real system-design answer runs 60–120s, so you will hit this constantly. Do not cut at arbitrary 25s boundaries — split on the **VAD silence boundaries Pipecat already gives you**, concatenate the returned glosses in order, and store the segment offsets. Arbitrary cuts sever sentences mid-clause and the translation quality drops noticeably, which would show up in your harness as a false vernacular penalty.

### 3.2 STT — streaming (Saaras v3)

```
wss://api.sarvam.ai/speech-to-text/ws?model=saaras:v3&language-code=te-IN
Authorization: Bearer <SARVAM_API_KEY>
```
- Send 16kHz mono PCM frames as binary WS messages, ~100–200ms chunks.
- Pass the **exact** `language-code` (`te-IN`/`hi-IN`/`en-IN`). `unknown` adds detection latency and misfires under heavy code-mixing.
- Consume `{type: "data", transcript, is_final}`. Persist only on `is_final`.
- Close codes: `1000` normal · `1006`/`1011` → reconnect with backoff (200/400/800ms, cap 3) · `4xxx` → **do not retry**, surface error, switch the UI to file-upload mode.

### 3.3 STT — batch (gloss path + file-upload fallback)

```
POST https://api.sarvam.ai/speech-to-text
Content-Type: multipart/form-data
Authorization: Bearer <SARVAM_API_KEY>

file: <wav, ≤30s>
model: saaras:v3
mode: translate
```

### 3.4 Competence scoring (Sarvam-30B)

```
POST https://api.sarvam.ai/v1/chat/completions
{
  "model": "sarvam-30b",
  "temperature": 0.1,
  "response_format": {"type": "json_object"},
  "messages": [
    {"role": "system", "content": "<scoring prompt, PRD §9>"},
    {"role": "user", "content": "<criteria_json + english_gloss_transcript>"}
  ]
}
```

**Three runs per scoring pass. Aggregation rule, stated precisely because you will hit disagreement:**

```python
def aggregate(runs):                       # runs = 3 results for one criterion
    scored = [r for r in runs if r.status == "scored"]
    if len(scored) < 2:                    # majority insufficient
        return {"status": "insufficient_evidence", "score": None,
                "low_consistency": len(scored) == 1}
    vals = sorted(r.score for r in scored)
    median = vals[len(vals)//2] if len(vals) % 2 else ceil((vals[0]+vals[1])/2)
    return {"status": "scored", "score": median,
            "low_consistency": (max(vals) - min(vals)) >= 2 or len(scored) == 2}
```

Take the evidence quote from whichever run produced the median. `low_consistency` fires on a spread of ≥2 points or a split status — surface it in the console as a small amber marker. Don't hide scorer disagreement; a judge who spots you hiding it is worse than a judge who sees you flag it.

**Keep turn-taking and scoring as separate calls.** TTFT is ~1.9s. The live follow-up generator gets its own short prompt ("given this answer, ask one specific follow-up"); the scoring prompt never runs mid-conversation. Merging these to save time will make every turn feel broken.

### 3.5 Fluency scoring — the path Rev 1 omitted

`language_proficiency.english_fluency` is required for the harness `proficiency_delta`, and Rev 1 never specified how it gets produced. It is a **separate call, on the raw disfluent original transcript, run after competence scoring completes**:

```
{
  "model": "sarvam-30b",
  "temperature": 0.1,
  "response_format": {"type": "json_object"},
  "messages": [{"role": "system", "content":
    "Rate this speaker's English fluency 1-5 from the raw transcript: grammar, "
    "vocabulary range, hesitation, self-correction, code-switching frequency. "
    "Do NOT assess technical content, correctness, or competence — you are rating "
    "language only. Return {\"english_fluency\": 1-5, \"notes\": \"...\"}"
  }, {"role": "user", "content": "<raw_original_transcript>"}]
}
```

**Ordering is not cosmetic.** Run competence first, in its own request, with no fluency context in the conversation. If the two ever share a prompt or a message history, the separation you're demoing is fiction and a judge reading your code would catch it. Two functions, two calls, no shared state.

### 3.6 TTS (Bulbul v3)

```
POST https://api.sarvam.ai/text-to-speech
{
  "inputs": ["<text, ≤2500 chars>"],
  "target_language_code": "te-IN",
  "model": "bulbul:v3",
  "speaker": "shubh",
  "pace": 1.0
}
```
Returns base64. Stream to the client as an `audio` WS event. **Verify `te-IN` and `hi-IN` produce audible, correct-language output in a throwaway script before Hour 1 ends** — coverage mismatch is the failure mode that kills demos silently.

### 3.7 Pipecat wiring (VAD + barge-in)

```python
from pipecat.services.sarvam.stt import SarvamSTTService
from pipecat.services.sarvam.tts import SarvamTTSService

stt = SarvamSTTService(
    api_key=SARVAM_API_KEY,
    model="saaras:v3",
    vad_signals=True,
    high_vad_sensitivity=True,
    keepalive=True,
)
tts = SarvamTTSService(api_key=SARVAM_API_KEY, model="bulbul:v3", speaker="shubh")

# UserStartedSpeaking while TTS playing → cancel current TTS. That IS barge-in.
# UserStoppedSpeaking → close turn buffer, upload audio, fire batch translate.
```

### 3.8 Rate-limit budget (do this arithmetic before Hour 4)

Free/Starter is roughly **60 req/min per account**, shared across all keys.

Per live session (~5 turns): 1 WS stream + ~8 batch-translate calls (5 turns, some chunked) + 5 follow-up LLM + 3 competence LLM + 1 fluency LLM + ~6 TTS ≈ **23 requests**.

**The harness is where this explodes.** 6 sessions × 3 scoring passes, fired in a loop, will burst well past 60/min and start returning 429s halfway through — at Hour 4, with the comparison view empty and no obvious cause.

**Mitigation, build it in from the start:** the harness runner processes sessions **serially with a 1.2s sleep between API calls**, and retries a 429 once after 30s. Six sessions takes about 4 minutes instead of 40 seconds. That is a fine trade at Hour 4 and a disaster to discover at Hour 4.

---

## 4. WebSocket event protocol

The interface most likely to stall your Hour-3 integration. Agree it at Hour 1 and freeze it.

**Client → server** (binary): raw 16kHz mono PCM frames.
**Client → server** (JSON):
```json
{"type": "start", "session_id": "...", "language": "te-IN"}
{"type": "clarification_request"}
{"type": "end"}
```

**Server → client** (JSON):
```json
{"type": "transcript", "text": "...", "is_final": false, "turn_idx": 3}
{"type": "agent_speaking", "text": "...", "audio_b64": "..."}
{"type": "barge_in_ack"}
{"type": "turn_complete", "turn_idx": 3}
{"type": "screen_complete", "session_id": "..."}
{"type": "error", "code": "stt_unavailable", "recoverable": true}
```

Dev A renders on `transcript`, plays on `agent_speaking`, stops playback on `barge_in_ack`, and redirects to the console on `screen_complete`. Nothing else.

---

## 5. Database — SQL, run this first

```sql
create table role (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  rubric_id uuid not null
);

create table candidate (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_id uuid references role(id),
  consent_ts timestamptz,
  created_at timestamptz default now()
);

create table rubric_criterion (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null,
  name text not null,
  definition text not null,
  evidence_required text not null,
  anchor_l1 text, anchor_l2 text, anchor_l3 text, anchor_l4 text, anchor_l5 text,
  weight numeric default 1.0
);

create table session (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidate(id),
  role_id uuid references role(id),
  language_condition text check (language_condition in ('english','vernacular')),
  spoken_language text,
  harness_pair_id uuid,
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table turn (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references session(id),
  idx int not null,
  asr_original_text text,
  asr_lang text,
  asr_english_gloss text,
  is_clarification boolean default false,
  audio_url text,
  segment_offsets jsonb,              -- VAD chunk boundaries, for >30s answers
  t_speech_end timestamptz,
  t_asr_final timestamptz,
  t_llm_first_token timestamptz,
  t_tts_first_byte timestamptz,
  unique (session_id, idx)
);

-- A scoring_pass is ONE invocation of scoring. It contains 3 self-consistency runs.
-- Rev 1 conflated these into a single run_index, which broke rescore.
create table scoring_pass (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references session(id),
  created_at timestamptz default now(),
  is_current boolean default true
);

create table criterion_score (
  id uuid primary key default gen_random_uuid(),
  scoring_pass_id uuid references scoring_pass(id),
  criterion_id uuid references rubric_criterion(id),
  run_index int not null check (run_index between 1 and 3),
  status text check (status in ('scored','insufficient_evidence')) not null,
  score int check (score between 1 and 5),   -- NULL on insufficient. No default. Never 0.
  evidence_quote_original text,
  evidence_quote_english text,
  reason text
);

create table criterion_result (       -- the aggregated view the console reads
  scoring_pass_id uuid references scoring_pass(id),
  criterion_id uuid references rubric_criterion(id),
  status text not null,
  score int,
  evidence_quote_original text,
  evidence_quote_english text,
  reason text,
  low_consistency boolean default false,
  primary key (scoring_pass_id, criterion_id)
);

create table language_proficiency (
  session_id uuid primary key references session(id),
  english_fluency int check (english_fluency between 1 and 5),
  disfluency_notes text
);

create table harness_pair (
  id uuid primary key default gen_random_uuid(),
  profile_label text not null,
  english_session_id uuid references session(id),
  vernacular_session_id uuid references session(id),
  competence_mad numeric,
  max_observed_gap numeric,
  proficiency_delta numeric,
  english_run_variance numeric,
  vernacular_run_variance numeric,
  runs_per_session int default 3
);
```

**Why the split matters:** Rev 1 used one `run_index` for both self-consistency runs and rescores, so pressing "rescore" would have produced runs 4–6 with no way to tell the console which set was current. Now: a rescore creates a new `scoring_pass`, flips the previous one's `is_current` to false, and history is preserved intact — which is also what makes the Memory & Context L4 claim honest rather than decorative.

Seed `role` + the four `rubric_criterion` rows from PRD §8 via `seed.py`, never by hand.

---

## 6. Backend API surface (`/api` — Dev B)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/sessions` | `{candidate_id, role_id, language_condition, spoken_language}` → `{session_id}` |
| `WS` | `/sessions/{id}/stream` | Protocol in §4 |
| `POST` | `/sessions/{id}/score` | New `scoring_pass`, 3 runs, aggregate → `criterion_result`; then fluency call. Returns scorecard |
| `POST` | `/sessions/{id}/rescore` | Same, new pass, flips `is_current` |
| `GET` | `/sessions/{id}/scorecard` | Current pass + quotes + proficiency + `low_consistency` flags |
| `GET` | `/sessions` | Console list |
| `POST` | `/sessions/{id}/writeback` | Build ATS payload (PRD Appendix), POST Beeceptor + Slack |
| `POST` | `/harness/run` | 6 sessions, serial + throttled per §3.8, computes stats per §7 |
| `GET` | `/harness/results` | All `harness_pair` rows |
| `GET` | `/sessions/{id}/latency` | Per-hop timings + aggregates per §8 |
| `POST` | `/admin/reset` | Truncate sessions/turns/scores, re-seed. Hour 6 needs this |

Define every shape as a Pydantic model at Hour 1. Ten minutes now, one avoided argument at Hour 3.

---

## 7. Harness statistics — exact formulas

These numbers go on stage. Rev 1 named the fields without defining them; ambiguity here means arguing about arithmetic at Hour 4.

Let `E[c]` = aggregated competence score for criterion `c` in the English session, `V[c]` the vernacular. `C` = criteria scored in **both** conditions.

```python
competence_mad     = mean(abs(E[c] - V[c]) for c in C)          # per-criterion MAD
max_observed_gap   = max(abs(E[c] - V[c]) for c in C)           # worst single criterion
proficiency_delta  = english_fluency(E_session) - english_fluency(V_session)
run_variance       = variance of the 3 raw run scores, averaged over criteria
```

Three rules that keep the claim honest:

1. **Criteria refused in either condition are excluded from MAD** — you cannot difference a `null`. Report the excluded count alongside. A criterion refused in *both* conditions (profile P3) is a success, not a gap.
2. **`max_observed_gap` is per-criterion, not on the overall mean.** Averaging first hides the tail, which is the exact move you're claiming to avoid.
3. **Compare `competence_mad` against `run_variance`.** If MAD ≤ run variance, your honest line is "the language difference is within scorer noise" — a stronger and more defensible statement than any bare number. If MAD exceeds run variance, say so plainly; a measured, disclosed gap beats a hidden one, and the rubric rewards the disclosure.

---

## 8. Latency reporting — don't claim p95 on n=5

Rev 1 said render p50/p95 per hop. With ~5 turns per session, "p95" is just the maximum wearing a lab coat, and a judge who knows statistics will notice.

**Per session:** report **median and max** per hop, labelled as such, with the turn count visible (`n=5`).
**Across the whole demo day:** pool every turn from every session — that's 40+ samples by Hour 6 — and report true p50/p95 there, labelled "pooled across N turns."

Hops to timestamp: `speech_end → asr_final`, `asr_final → llm_first_token`, `llm_first_token → tts_first_byte`, `tts_first_byte → playback_start`.

---

## 9. Frontend structure (`/web` — Dev A)

```
app/
  screen/[sessionId]/page.tsx
    components/ LanguagePicker · ConsentGate · MicCapture · TranscriptView
                AudioPlayback · FileUploadFallback
  console/page.tsx
    components/ SessionList · ScoreCard · ProficiencyPanel · LatencyPanel
                RescoreButton · ConsistencyBadge
  harness/page.tsx
    components/ PairedComparison · GapHighlight · VarianceNote
lib/ api.ts (typed wrappers, §6) · ws.ts (protocol, §4) · audio.ts (PCM encode)
```

`MicCapture` and `FileUploadFallback` must call the **same** `api.ts` functions — same session creation, same scoring path, different input. That's what makes the Hour-6 fallback free instead of an untested second code path.

`ProficiencyPanel` renders below a visible horizontal rule, headed *Recorded, not scored*. `ConsistencyBadge` renders the amber marker when `low_consistency` is true.

---

## 10. Split of work

- **Dev A never touches** `/api` internals or Supabase. REST + WS only.
- **Dev B never touches** `/web`, and never changes a response shape after Hour 2 without saying so out loud.
- Shared contract: `types.ts` ↔ `models.py`, hand-synced. No codegen today.

---

## 11. Pre-rehearsal checklist

- [ ] `te-IN` and `hi-IN` TTS audible and in the right language
- [ ] `mode=translate` tested on the **actual P1–P3 recordings**, not sample sentences
- [ ] A >30s answer chunks on VAD boundaries and reassembles in correct order
- [ ] P3 returns `insufficient_evidence` in **both** conditions
- [ ] Rescore creates a new pass; console shows the new one; the old one still exists
- [ ] Mid-session refresh loses nothing
- [ ] Harness completes without a 429
- [ ] Both public URLs reachable from a phone on different Wi-Fi
- [ ] Beeceptor shows the POST live; Slack fires
- [ ] Backup key swaps in cleanly
- [ ] Cached full run replays with zero live API calls
- [ ] `/admin/reset` returns to a clean demo state in one call

---

## 12. What not to build

Real auth · multi-role rubrics · resume parsing · telephony · languages outside {en, hi, te} · a vector DB (the rubric fits in the prompt) · custom VAD · a second LLM provider "just in case" · Supabase realtime · retry logic beyond §3.2.
