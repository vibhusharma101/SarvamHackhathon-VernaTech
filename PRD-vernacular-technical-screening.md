# PRD — Vernacular Technical Screening
### "Score the engineering, not the English — and prove it."

| | |
|---|---|
| **Event** | Sarvam Epoch Buildathon (GrowthX × Sarvam AI), Bengaluru |
| **Build window** | 6 hours |
| **Team** | 2 devs. Dev A = frontend-leaning (candidate page, recruiter console, harness view). Dev B = Sarvam pipeline, scoring service, data layer, ATS mock. |
| **Sarvam parameter (locked)** | Voice Experience |
| **Status** | Ready to build. Section 15 lists the four decisions to close before 10:00. |

---

## 1. Problem

A technical phone screen is supposed to measure whether someone can do the job. In practice it measures how fluently they can narrate the job under time pressure, in English, to a stranger. Those are different things, and the gap between them is where good engineers get filtered out.

### 1.1 Primary validation (our own, collected 26 July)

Three working engineers, asked what caused their interview rejections. Unprompted, all three named the same thing.

| Respondent | What they said | Failure mode |
|---|---|---|
| **Vikram Singh** | "Even when I know the solution, I sometimes struggle to explain my thought process clearly, which can make it seem like I'm less confident or less prepared than I actually am." Also: didn't fully understand the problem statement, so made assumptions instead of clarifying. | Expressive gap; no safe path to clarify |
| **Vivek Gupta** | Explaining a Stack problem at PriceLabs — knew it, couldn't convey the intuition, spent ~30 min on one question, interviewer had no time left for a second. | Expressive gap consumed the evidence budget |
| **Gopal** | "I know the concept but maybe due to pressure I forget things while explaining." Interviewer was US-based — "difficulties understanding each other's accent as well which led to poor communication." Also: expected theory, got DSA. | Pressure-induced expressive failure + **two-way** accent breakdown + format surprise |

**Read carefully:** none of them said they lacked the knowledge. All three described knowing the answer and failing to transmit it. Vikram names the reputational consequence exactly — the interviewer concludes *less prepared*, when the truth is *less fluent right now*. That inference is the bug.

Gopal's accent point matters more than it first appears. The comprehension failure was **mutual** — an Indian candidate and an American interviewer each struggling to parse the other. This is not a candidate deficiency to be accommodated. It is a property of the format, and it has no business deciding round one.

**Honest caveat, and say this on stage:** n=3, drawn from our own network, self-reported and retrospective. This is directional qualitative validation that motivated the build — it is not a statistic. We do not extrapolate from it, and we do not put a percentage on it.

### 1.2 Supporting evidence (from the research report — use 3, not 12)

- **Koenecke et al. 2020, PNAS** — five commercial ASR systems averaged 0.35 WER for Black speakers vs 0.19 for white speakers; 0.41 vs 0.21 among men. Machine transcription is not neutral across ways of speaking.
- **Behroozi et al., ESEC/FSE 2020 (NC State + Microsoft)** — technical interview performance "reduced by more than half, by simply being watched by an interviewer." n=48 students, one problem. Indicative, not population-level.
- **Sackett et al. 2022, J. Applied Psychology** — structured interviews predict job performance at r=.42 vs r=.19 unstructured. Structure roughly doubles validity.

That's the whole case: observation halves performance, fluency contaminates the judgment, and structure is the known fix. Leave the fragile numbers out entirely.

---

## 2. Product thesis

> Conduct the first-round technical screen in whatever language the candidate thinks in. Score the **evidence of engineering** in what they said. Record language proficiency as a **separate field that never touches the competence score**. Then prove, on a paired test set, that switching language does not move the competence score.

The last sentence is the product. Everything before it is a voice bot.

**Why Voice Experience is the correct Sarvam parameter:** the evidence exists only as speech — a person describing what they built. Document Intelligence has no artifact to parse; Dubbing localizes media rather than eliciting evidence. The capability that makes or breaks the job is understanding messy code-switched Indian speech well enough to score it and speaking a natural follow-up back. Under the rubric's single-capability rule, Voice Experience is the only choice that scores.

---

## 3. Scope

### In scope
1. Candidate joins by browser link, picks a language (English / Hindi / Telugu), consents to recording.
2. Voice agent runs a structured 4-criterion backend-engineering screen in that language.
3. Follow-ups that build on the candidate's previous answer.
4. Clarification is free — asking "what do you mean?" is never scored as a deficit.
5. Evidence-anchored scoring with the candidate's own quoted words attached to every criterion.
6. Refusal state — insufficient evidence returns `insufficient_evidence`, never a low score.
7. Language proficiency recorded separately, visibly excluded from competence.
8. Recruiter console: scorecards, evidence quotes, latency panel.
9. **Fairness harness**: 3 paired profiles × 2 languages × 3 runs, with agreement statistics.
10. English scorecard written back to a mocked ATS with original-language quotes preserved.

### Explicitly out of scope
- **Coding environment / autocomplete / IDE** (Vivek's second point). Real, and a different product. Say so if asked — it shows we read our own research rather than pattern-matching every complaint into scope.
- Telephony. Browser mic only. (Organizer guidance; also TRAI DLT rules.)
- Real ATS integration, real auth, resume parsing, scheduling, multi-role rubrics.
- Any claim of bias reduction we have not measured on our own paired set.
- Any language outside {English, Hindi, Telugu} — Bulbul v3 covers 11 languages, not 22. Do not drift.

---

## 4. Users

**Mahesh — candidate.** Four years backend, Karimnagar. Explains his work precisely in Telugu and Hinglish. Freezes when the same question arrives in English. Currently never reaches the hiring manager. His job: *be evaluated on what I actually did.*

**Farah — talent acquisition lead.** High-volume hiring across several states. Her hiring managers keep telling her that people who interviewed badly perform well once hired. Her job: *stop losing good engineers in round one, and be able to defend how round one works.*

---

## 5. Core mechanics

### M1 — Vernacular elicitation
Saaras v3 streaming STT, `mode="transcribe"` for the original-language transcript, plus a `mode="translate"` pass for the English gloss. Both are retained: the original is the audit evidence, the English is what the scorer reads.

### M2 — Evidence-anchored scoring
The scorer receives the **English gloss only** and must, for every criterion, either quote the specific span that justifies the score or declare insufficient evidence. No quote → no score. This makes fluency structurally unable to influence the result, because the scorer never sees fluency.

**Anticipated judge question — prepare this answer.** *"Isn't it circular? You translate away the disfluency, then score the translation."*
> That's the mechanism, and it's deliberate — not a coincidence we're hiding. The point isn't that a model magically ignores accent; it's that we normalize to meaning *before* scoring, instead of letting fluency leak into a human's or an English-first model's competence judgment. And it can genuinely fail: translation routinely drops technical specificity, which would make the vernacular run score *lower*. The harness is what tells us whether it did. That's precisely why we measured instead of asserting.

### M3 — Separated language proficiency
`language_proficiency.english_fluency` is scored 1–5 from the raw English-run audio and stored on the session. It is never an input to competence scoring, never weighted into the overall, and is rendered in the UI in a visually distinct block labelled *recorded, not scored*.

### M4 — The fairness harness *(this is the card)*
Three paired candidate profiles. Each profile is the **same engineering content**, delivered twice: once as fluent English, once as less-fluent Telugu/Hinglish. Three scoring runs per session. Report mean absolute difference in competence, the largest single observed gap, within-condition run variance, and the proficiency delta.

The organizer's card warns that this produces no visible UI and so gets skipped. We build the comparison view in Hour 4, before polish.

### M5 — Refusal state
`status: insufficient_evidence`, `score: null` (never 0), plus a `reason` naming what was missing. Rendered grey and neutral, never red. A dropped line or a nervous silence is not a competence finding.

### M6 — Clarification is free *(from Vikram)*
The agent opens each question with a one-line scope statement, and if the candidate asks what's meant, it rephrases without penalty. Clarification turns are tagged `clarification: true` and excluded from scoring input. Vikram made assumptions because clarifying felt costly; here it costs nothing.

### M7 — No format surprises *(from Gopal)*
Before the first question, the agent states in the candidate's language what the screen covers and how long it takes. Two sentences. Cheap, and it removes the exact ambush Gopal described.

---

## 6. Functional requirements

### 6.1 Candidate page — `/screen/[sessionId]`

| ID | Requirement | Acceptance |
|---|---|---|
| C1 | Language picker: English / हिन्दी / తెలుగు | Selection persists to session record |
| C2 | Plain-language consent to record + screen, with purpose stated | `consent_ts` written before mic activates |
| C3 | Agent states scope and duration in chosen language (M7) | Spoken via Bulbul v3 in selected language |
| C4 | Live mic capture, 16kHz PCM/WAV to Saaras v3 WebSocket | Interim transcript visible within ~1s of speech |
| C5 | Barge-in — speaking over the agent stops TTS playback | Pipecat `START_SPEECH` halts audio mid-sentence |
| C6 | Follow-up references content of previous answer | Follow-up contains a specific noun/decision the candidate raised |
| C7 | Clarification request rephrases, does not penalize (M6) | Turn tagged `clarification: true`, absent from scorer input |
| C8 | **Fallback:** upload a pre-recorded WAV instead of live mic | Same pipeline, same scorecard, no mic permission needed |

### 6.2 Recruiter console — `/console`

| ID | Requirement | Acceptance |
|---|---|---|
| R1 | Session list with candidate, role, language, competence, recommendation | Loads from DB, survives refresh |
| R2 | Per-criterion score with original-language quote **and** English gloss side by side | Every scored criterion shows both |
| R3 | Refusal rendered distinctly from a low score | Grey "insufficient evidence"; visibly not a 1/5 |
| R4 | Language proficiency in a separate block marked *recorded, not scored* | Physically separated from competence panel |
| R5 | Latency panel: p50/p95 for ASR, LLM, TTS-first-byte | Real measured numbers, not placeholders |
| R6 | Reopen a past session and re-score it | Produces a new `run_index`, prior runs retained |
| R7 | Push scorecard to Beeceptor + Slack | POST visible live in Beeceptor inspector |

### 6.3 Harness view — `/harness`

| ID | Requirement | Acceptance |
|---|---|---|
| H1 | Per profile: English run vs vernacular run, side by side | Competence aligned, proficiency visibly divergent |
| H2 | Mean absolute difference in competence, per profile and overall | Computed from stored runs, not typed in |
| H3 | **Largest single observed gap shown prominently** | Displayed, not buried — including if it's unflattering |
| H4 | Within-condition run-to-run variance | Demonstrates scorer stability |
| H5 | Proficiency delta between conditions | The number that *should* differ |

---

## 7. Data model

```sql
Candidate(id, name, role_id, consent_ts, created_at)
Role(id, title, rubric_id)

RubricCriterion(
  id, rubric_id, name, definition, evidence_required,
  anchor_l1..anchor_l5, weight
)

Session(
  id, candidate_id, role_id,
  language_condition ENUM('english','vernacular'),
  spoken_language,              -- 'en-IN' | 'hi-IN' | 'te-IN'
  harness_pair_id NULL,
  started_at, ended_at
)

Turn(
  id, session_id, idx,
  asr_original_text, asr_lang, asr_english_gloss,
  is_clarification BOOL DEFAULT false,
  audio_url,
  t_speech_end, t_asr_final, t_llm_first_token, t_tts_first_byte
)

CriterionScore(
  id, session_id, criterion_id, run_index,
  status ENUM('scored','insufficient_evidence'),
  score NULL,                   -- NULL when insufficient. NEVER 0.
  evidence_quote_original, evidence_quote_english,
  reason                        -- populated only on insufficient_evidence
)

LanguageProficiency(session_id, english_fluency, disfluency_notes)
-- Deliberately a separate table. Cannot be joined into competence by accident.

HarnessPair(
  id, profile_label,
  english_session_id, vernacular_session_id,
  competence_mad, max_observed_gap, proficiency_delta,
  runs_per_session
)
```

Two structural guarantees worth stating out loud in the demo: refusal is `NULL`, not `0`, so it can never be averaged into a competence score; and proficiency lives in its own table, so contaminating the score would require a deliberate join, not an accident.

---

## 8. The rubric (write this before you write code)

Role: **Backend Engineer**. Four criteria. Scale 1–5.

**1. Production debugging**
*Definition:* Diagnosed a real failure in a running system.
*Evidence required:* a specific symptom, the diagnostic method used, and the fix.
- L1 generic ("we fixed bugs") · L2 names a bug, no method · L3 symptom + method · L4 symptom + method + fix, specific and coherent · L5 all of that plus what they'd do differently or how they prevented recurrence

**2. Data modelling**
*Definition:* Made a schema or data-structure decision and can justify it.
*Evidence required:* the shape chosen, and why over an alternative.
- L1 names a database only · L2 describes a schema, no reasoning · L3 schema + one reason · L4 schema + reasoning + rejected alternative · L5 all that plus how it behaved under real load or change

**3. Concurrency / scale behaviour**
*Definition:* Handled concurrent load, race conditions, caching, or queueing.
*Evidence required:* a concrete instance with the mechanism named.
- L1 buzzwords only · L2 names a mechanism, no instance · L3 mechanism + instance · L4 mechanism + instance + why that mechanism · L5 plus failure modes or trade-offs of the choice

**4. Trade-off articulation**
*Definition:* Chose one path and can explain what was given up.
*Evidence required:* decision, alternative, cost accepted.
- L1 no trade-off framing · L2 asserts a decision · L3 decision + alternative · L4 decision + alternative + cost accepted · L5 plus what would change the decision

**Overall** = mean of scored criteria. Criteria with `insufficient_evidence` are excluded from the mean, never counted as zero — and the count of excluded criteria appears on the scorecard so a thin screen looks thin rather than looking bad.

---

## 9. Scoring prompt (Sarvam-30B)

Config: `temperature=0.1`, JSON mode on, 3 runs per session, per-criterion median.

```
You are scoring a technical screening transcript for a backend engineering role.

You are scoring EVIDENCE OF ENGINEERING WORK, not communication quality.
Do not consider grammar, fluency, vocabulary, hesitation, or sentence structure.
These carry no information about engineering competence.

For each criterion:
- If the transcript contains evidence meeting the requirement, assign 1-5 using the
  anchors and QUOTE the exact span that justifies it.
- If it does not, return status "insufficient_evidence", score null, and state in
  `reason` what specifically was missing.

You may not assign a score without a supporting quote.
A short or incomplete answer is insufficient evidence — it is not a low score.

CRITERIA:
{criteria_json}

TRANSCRIPT (clarification turns excluded):
{english_gloss_transcript}

Return only this JSON, no prose:
{
  "criteria": [
    {"name": "...", "status": "scored"|"insufficient_evidence",
     "score": 1-5|null, "evidence_quote": "...", "reason": "..."}
  ]
}
```

Three guards, all load-bearing: the scorer never sees the language condition, never sees the raw disfluent text, and cannot produce a score without a quote. Sarvam-30B is fast but verbose and scores poorly on hallucination benchmarks — these constraints are what make it usable as a scorer.

---

## 10. Paired profiles (build before 11:30 — non-negotiable)

Three profiles. Each is one set of engineering facts, written twice.

| Profile | Content | English version | Vernacular version |
|---|---|---|---|
| **P1 — Mahesh** | Redis cache for a traffic spike; heap dump on a memory leak | Fluent, complete | Telugu/Hinglish, hesitant, self-corrects once |
| **P2** | Postgres → partitioned table migration; chose consistency over latency | Fluent | Hindi/Hinglish, filler words, one restart mid-sentence |
| **P3 — thin on purpose** | Vague on concurrency; **should trigger a refusal** | Fluent but shallow | Vernacular, equally shallow |

P3 exists to prove the refusal state fires on content, not on language — it must return `insufficient_evidence` in *both* conditions. If it refuses only the vernacular run, the harness has found a real bug and you'd rather know at 14:00 than on stage.

Record the vernacular audio **before 12:00**, 16kHz WAV. It's both harness fuel and your hardware-independent fallback.

---

## 11. What we may and may not claim

**May claim:**
- "Across 3 paired profiles × 3 runs, mean competence differed by *X* between English and vernacular, within run-to-run noise, while recorded English proficiency differed by *Y*."
- "Largest single gap we observed was *Z* — here it is."
- "This is the measurement method an enterprise would scale for a four-fifths adverse-impact audit."

**May not claim:** any bias-reduction percentage; that this generalizes beyond our set; that Voice Experience is robust across arbitrary noise and accents; that Sarvam's published WER figures are independently verified.

Reporting the largest gap rather than only the average is a scoring move, not just honesty. Judges have seen averages that hide their tails.

---

## 12. Non-functional

**Stack:** Next.js (App Router) on Vercel · FastAPI service for pipeline + scoring · Pipecat with `SarvamSTTService` / `SarvamTTSService` (`saaras:v3`, `bulbul:v3`) · Supabase Postgres · Beeceptor for the ATS mock · Slack webhook for delivery.

**Sarvam limits to respect:** REST STT caps at 30s per request — stream instead. Streaming WS accepts WAV/PCM only, never MP3/WebM. Bulbul v3 covers 11 languages; Telugu and Hindi are in, so we're safe. Sarvam-30B TTFT ≈ 1.9s — split fast follow-up generation from heavy end-of-interview scoring or turns will feel broken. Rate limits are per *account*, so provision two keys and top up credits tonight.

**Latency instrumentation:** timestamp speech-end → ASR-final → LLM-first-token → TTS-first-byte → playback. Compute p50/p95 per hop, render live. The rubric penalizes unmeasurable "instant" claims — real p95 numbers beat a claim of real-time.

**Failure handling:** WS close codes — reconnect with backoff on 1006/1011, never auto-retry 4xxx (auth/quota). Cache one complete golden-path run that replays with zero API calls. Persist everything server-side; a mid-demo refresh must lose nothing.

---

## 13. Build plan

**Pre-build (before 11:30 / 12:00):** write the three paired profiles and the rubric anchors; record vernacular audio. Skip this and you lose the card.

| Hour | Dev A (frontend) | Dev B (pipeline) | Gate | Rubric evidence |
|---|---|---|---|---|
| **1** | Next.js live on public Vercel URL; candidate page with file-upload; empty console | FastAPI up; Saaras v3 transcribes a real WAV; Sarvam-30B returns valid JSON; one Bulbul Telugu utterance plays | Uploaded WAV → scorecard on screen → POST lands in Beeceptor, on the public URL | JTBD |
| **2** | Console renders per-criterion scores with quotes; refusal styled grey | Real 4-criterion rubric; enforce quote-per-score; refusal path; temp 0.1 | No bare numbers — every score has a quote or a reason | JTBD + Delight |
| **3** | Live mic capture; streamed TTS playback; live transcript | Pipecat pipeline; `vad_signals=True`; barge-in on `START_SPEECH`; context-carrying follow-up | Barge-in cuts TTS cleanly once; follow-up cites prior content | Voice Experience + Memory |
| **4** | **Harness comparison view** | Batch 3 profiles × 2 languages × 3 runs; compute MAD, max gap, variance | Real numbers render; largest gap displayed | Creativity + Impact |
| **5** | Latency panel; reopen-run UI; Slack delivery | Latency API; final ATS payload; reopen-and-re-score | Refresh loses nothing; latency real; Slack receives scorecard | Memory + Voice |
| **6** | **Freeze. No new features.** 3 hands-off runs · reset script · fallback audio verified · public link tested from another device · two timed rehearsals under 3:00 | | Two clean rehearsals, zero intervention | — |

**Cut order if behind:** drop reopen-and-re-score, then live barge-in, then live mic (fall back to upload). **Never cut the harness** — it is the only thing here that isn't a commodity voice bot.

---

## 14. Demo script (3:00) and evidence map

1. **(20s)** "All three engineers we asked named the same rejection cause — not knowing, *explaining*. One of them interviewed with an American engineer and neither could parse the other's accent. We screen for engineering evidence in the candidate's own language, and we prove the language doesn't move the score."
2. **(60s)** Mahesh answers a debugging question live in Telugu/Hinglish. Agent asks a follow-up referencing his answer. Console fills with anchored scores, each carrying his own words plus an English gloss.
3. **(30s)** Line drops mid-answer. Agent probes once, then marks concurrency **insufficient evidence** rather than 1/5. Barge-in demonstrated.
4. **(20s)** English scorecard posts to the mocked ATS and Slack, original-language quotes intact.
5. **(30s)** Harness view: competence delta *X*, proficiency delta *Y*, largest single gap *Z* shown. Plus the p95 latency panel.
6. **(10s)** "Browser mic → Saaras v3 → Sarvam-30B → Bulbul v3 in Pipecat; scores and quotes to a mocked ATS."
7. **Judge Q:** the circularity question from §5 (M2). Have that answer memorized — it's the one question a sharp judge will ask.

**Evidence map — one moment per parameter, no double-counting:**

| Moment | Parameter | Target |
|---|---|---|
| Live code-switched answer + self-correction + barge-in + latency panel | Voice Experience | L4 |
| Follow-up referencing prior answer + reopen/re-score | Memory & Context | L4 |
| "Assess evidence, prove language-independence" framing + harness | Creativity | L5 |
| Harness statistic with largest gap shown | Impact | L4 |
| Refusal + graceful recovery | Delight | L4 |
| 3 hands-off end-to-end runs | Job-to-be-done | L4 |

---

## 15. Decide before 10:00

1. **Vernacular language for the demo** — Telugu (matches Mahesh, stronger story) or Hindi (easier to source a convincing less-fluent speaker in the room)? Both are Bulbul-supported.
2. **Who records the vernacular audio** — one of you, or someone recruited at the venue? Needs to be settled by 12:00, not 15:30.
3. **Supabase or SQLite** — Supabase if either of you has used it; SQLite on a single pinned FastAPI process if not. Do not learn a datastore today.
4. **Slack or Resend** for delivery. Slack projects better.

---

## Appendix — ATS payload

```json
{
  "candidate_id": "cand_mahesh_001",
  "role": "Backend Engineer",
  "screen_language": "te-IN + en-IN (code-mixed)",
  "recommendation": "advance_to_hiring_manager",
  "competence": {
    "overall": 4.3,
    "scale_max": 5,
    "criteria_scored": 3,
    "criteria_insufficient": 1,
    "criteria": [
      {
        "name": "Production debugging",
        "status": "scored",
        "score": 5,
        "evidence_original": "prod lo memory leak vachindi, heap dump teesi analyze chesanu...",
        "evidence_english": "we had a memory leak in prod, I took a heap dump and analyzed it..."
      },
      {
        "name": "Concurrency / scale behaviour",
        "status": "insufficient_evidence",
        "score": null,
        "reason": "Candidate began an example but the connection dropped; follow-up not completed."
      }
    ]
  },
  "language_proficiency": {
    "english_fluency": 2,
    "scale_max": 5,
    "note": "Recorded separately. NOT an input to competence scoring."
  },
  "fairness_audit": {
    "harness_pair_id": "pair_001",
    "competence_mad_vs_english_run": 0.3,
    "max_observed_gap": 0.7,
    "proficiency_delta": 2.0
  },
  "audit": {
    "session_id": "sess_...",
    "scorer_model": "sarvam-30b",
    "scorer_temperature": 0.1,
    "runs_per_criterion": 3,
    "consent_ts": "2026-07-26T10:14:22+05:30"
  },
  "latency_ms": {
    "asr_p50": 320, "asr_p95": 610,
    "llm_p50": 1900, "tts_first_byte_p50": 240
  }
}
```

Four things this payload does that a naive one doesn't: refusals carry `null` rather than a silent zero; every score ships with the candidate's original words *and* a gloss; proficiency is labelled as excluded at the point a reader would otherwise assume it counted; and the scorer's provenance travels with the record, which is what makes the decision defensible a year later when someone asks how it was made.
