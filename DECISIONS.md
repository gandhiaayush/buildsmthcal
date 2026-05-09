# Cadence — Architecture Decision Records

Single reference for every non-obvious engineering choice.
Update when a decision changes. Date each entry.

---

## ADR-001: Deepgram Voice Agent as conversation engine (2026-04-26) [SUPERSEDED by ADR-009]

**Decision:** Use Deepgram Voice Agent (single bidirectional WebSocket) for the
entire STT → LLM → TTS pipeline instead of three separate API calls.

**Status:** Superseded. See ADR-009. `src/agent.js` is commented out.

---

## ADR-002: Two separate Gemini calls — parse then route (2026-04-26) [DEPRECATED]

**Status:** Deprecated. Cadence does not use Gemini. Risk scoring is deterministic (ADR-012).

---

## ADR-003: SQLite WAL for persistence (2026-04-26) [SUPERSEDED by ADR-010]

**Status:** Superseded. Replaced by InsForge (PostgreSQL). See ADR-010.

---

## ADR-004: Atomic task claim in scheduler (2026-04-26)

**Decision:** Scheduler uses atomic UPDATE via PostgreSQL RPC to claim a task before firing.
Pattern retained in Cadence — see `claim_appointment_outreach` and `claim_waitlist_slot` RPCs.

**Why:** Prevents double-fire if scheduler ticks overlap or server restarts mid-tick.

---

## ADR-005: mark_complete as call termination signal (2026-04-26) [DEPRECATED]

**Status:** Deprecated. Retell AI manages its own call termination. Call outcomes
are received via `call_analyzed` webhook event (see ADR-009).

---

## ADR-006: Exa search for phone number lookup (2026-04-26) [DEPRECATED]

**Status:** Deprecated. Cadence dials phone numbers from the `patients` table (loaded via CSV).
No outbound phone lookup needed.

---

## ADR-007: Pino structured logging (2026-04-26)

**Decision:** Use Pino for all server logging. JSON in production, pretty-print in dev.

**What is logged at minimum:**
- Retell call trigger (appointmentId, retellCallId)
- Webhook events received (callId, event type)
- Outcome + sentiment classification (callId, outcome, sentiment)
- Waitlist backfill trigger (openedSlot, provider, claimed)
- All errors with context

**Still applies in Cadence.**

---

## ADR-008: CLI as primary interface (2026-04-26) [SUPERSEDED]

**Status:** Superseded. Cadence uses a Next.js frontend dashboard as primary interface.
No CLI task submission. See frontend/src/app/(app)/dashboard/page.tsx.

---

## ADR-009: Retell AI replaces Deepgram Voice Agent (2026-05-09)

**Decision:** Use Retell AI for the entire outbound voice pipeline (STT + LLM + TTS).
`src/agent.js` (Deepgram Voice Agent) is commented out but retained for reference.

**Why Retell AI:**
- Full outbound call management — no Twilio TwiML required for the voice pipeline
- Dynamic prompt variables per call (`{{patient_name}}` etc.) — no per-call agent mutation
- Single `POST /v2/create-phone-call` to initiate + `call_analyzed` webhook for outcome
- `claude-4.6-sonnet` LLM option — same model family as the rest of the stack
- Simpler hackathon integration than custom Deepgram WS + Twilio Media Streams bridge

**Accepted trade-offs:**
- Retell controls the call lifecycle — less flexibility than raw Twilio + Deepgram
- Agent must be pre-created (one-time setup via `scripts/setup-retell.js`)
- Dynamic variables injected at call-creation time — prompt cannot change mid-call

**Verified API facts (2026-05-09):**
- LLM model: `claude-4.6-sonnet` (exact string — Retell 400s on anything else)
- Voice: `cartesia-Cleo` (verified from `/list-voices`)
- Webhook: `call_analyzed` event contains transcript + analysis fields

---

## ADR-010: InsForge replaces Supabase (2026-05-09)

**Decision:** Use InsForge (project `fy4p4tyq`) as the PostgreSQL backend.
`@insforge/sdk` replaces `@supabase/supabase-js`.

**Why InsForge:**
- Sponsor integration for the hackathon
- Same Postgres semantics — migration path is straightforward
- `@insforge/cli` provides migration management identical to Supabase migrations

**Key SDK differences from Supabase:**
- `createClient({ baseUrl, anonKey })` — `anonKey` field (not `supabaseKey`)
- `insforge.database.from()` — not `supabase.from()`
- Insert requires array: `insert([{...}])` — NOT `insert({...})`
- RPC via `.rpc('function_name', { arg1: val })` — same pattern as Supabase

**Database schema:** 4 tables — `patients`, `appointments`, `waitlist`, `calls`.
Two atomic RPCs: `claim_appointment_outreach` and `claim_waitlist_slot`.

---

## ADR-011: No frontend auth for v1 (2026-05-09)

**Decision:** Dashboard is open (no login required). No auth middleware on any route.

**Why:**
- Hackathon demo does not need auth
- Saves 2–3 hours of implementation + session handling complexity
- Target deployment: internal clinic use on a private URL

**Required before production:** Add auth (Retell webhook signature already validates
inbound Retell calls; Twilio signature validation is in place on Twilio webhooks).

---

## ADR-012: Deterministic risk scoring (2026-05-09)

**Decision:** Risk scoring (`src/risk-scoring.js`) is a weighted factor sum, no ML model.

**Factors:** no_show history, appointment type, day of week, time of day, days since
last visit, lead time. Score clamped [0, 1]. Returns plain-English reason.

**Why not ML:**
- No training data available at hackathon time
- Deterministic = reproducible, explainable to clinic staff and judges
- No external API cost or latency
- Scores update synchronously on CSV upload — no async pipeline needed

**Outreach threshold:** appointments with `risk_score >= 0.7` are flagged for
automated outreach by the daily scheduler.

---

## Open Decisions

1. **RETELL_PHONE_NUMBER** — user must add this from Retell dashboard to `.env`.
   Without it, outbound calls fail at `createRetellCall`.

2. **Concurrent call cap** — no hard cap enforced. Recommend ≤5 for demo.
   `countActiveCalls()` is tracked in the `calls` table.

3. **Phone number validation** — no E.164 normalization before dial.
   Retell will reject malformed numbers with a 400. Flag as known limitation.

4. **Waitlist backfill timing** — triggered on `no_answer` / `declined` webhook outcome.
   If Retell does not return these exact outcome strings, backfill won't fire.
   Verify Retell's `call_analysis.call_successful` field semantics against live docs.
