
## Documentation-First Rule

Before writing code that touches any external API, library, or SDK not yet
verified this session: look up current documentation first (web search,
official docs, or local `docs/` folder). Don't rely on memory for anything
version-specific or recently updated. For routine operations on well-known
tools already verified this session, use discretion.

The APIs below have local docs or known-stale-risk — always check these:

| What | URL | When to fetch |
|------|-----|---------------|
| **InsForge SDK + CLI** | [docs/insforge-api.md](docs/insforge-api.md) | Any InsForge change — DB, auth, storage, AI, realtime, payments, functions |
| **Retell AI create-agent** | https://docs.retellai.com/api-references/create-agent | Creating/updating Retell agents |
| **Retell AI create-phone-call** | https://docs.retellai.com/api-references/create-phone-call | Triggering outbound calls |
| **Retell AI webhook** | https://docs.retellai.com/webhook | Webhook event format, signature verification |
| Twilio Programmable Voice | https://www.twilio.com/docs/voice | Webhook format, TwiML verbs, call lifecycle |
| Twilio Media Streams | https://www.twilio.com/docs/voice/media-streams | WS protocol, audio format (mulaw 8kHz), frame size (160 bytes/20ms) |

**Rule:** If a task touches InsForge — invoke `/insforge` (SDK) or `/insforge-cli` (backend infra) skill first, then read `docs/insforge-api.md`. Never write InsForge SDK calls or CLI commands from memory.

**Rule:** If a task touches Retell AI — fetch the relevant doc page first with WebFetch.
Field names and event types change; wrong field name = silent failure (API returns 400 with allowed values list).
Always verify against live docs.

**Critical Retell AI facts (verified 2026-05-09 — still verify before changes):**
- Outbound calls: `POST /v2/create-phone-call` with `from_number`, `to_number`, `override_agent_id`, `retell_llm_dynamic_variables`
- Dynamic variables injected as `{{variable_name}}` in Retell LLM prompt — no per-call agent update needed
- LLM model (exact string): `claude-4.6-sonnet` — Retell rejects other strings with 400
- Voice (verified working): `cartesia-Cleo`
- Webhook signature: `x-retell-signature` = HMAC-SHA256(RETELL_API_KEY, rawBody)
- Key webhook event: `call_analyzed` (fires after call ends with transcript + analysis)
- Deepgram Voice Agent: **commented out in src/agent.js** — DO NOT re-enable

**Critical audio pipeline rules (Twilio Media Streams — if using Twilio path):**
- Twilio Media Streams sends/receives **mulaw 8kHz, 160 bytes/frame (20ms)**

---

## Sub-Agent Development — MANDATORY

**This project requires sub-agent driven development. These are hard rules, not suggestions.**

### Before writing any code

**SPAWN PARALLEL EXPLORE AGENTS** for any task touching more than 2 files:
- Launch 2-3 Explore agents in a SINGLE MESSAGE (parallel, not sequential)
- One reads current file state. One fetches live API docs. One checks existing patterns.
- Never read files sequentially when parallel reads are possible.

**FETCH LIVE DOCS** before any Deepgram or Twilio API call:
- Use WebFetch. Training knowledge on these APIs is stale.
- Wrong audio format = silent failure. No exception, no error log, just broken audio.

**SPAWN PLAN AGENT** before writing more than 50 lines of new code:
- New file, new feature, new audio pipeline → Plan agent first.
- Present plan. Get user approval. Then build.
- Skip only for single-line fixes and renames.

### During build

**PARALLEL IS THE DEFAULT:**
- Independent reads → single message with multiple tool calls
- Never serialize tool calls with no dependencies between them

**NEVER WRITE AUDIO PARAMETERS FROM MEMORY:**
- Always verify `sample_rate`, `encoding`, `container` against fetched docs
- Deepgram Voice Agent: input linear16 48kHz, output linear16 24kHz
- Twilio Media Streams: mulaw 8kHz, 160 bytes/frame

### After each milestone

**SPAWN REVIEW AGENT** before moving to next milestone:
- Diff-based review → `/review` skill
- Call flow changed → `/qa` skill, test with a real phone number

### Sub-agent routing

| Task | What to do |
|------|------------|
| Multi-file exploration | Explore agents (2-3 in parallel) |
| New feature design | Plan agent |
| Code review | invoke `/review` |
| Bug in running code | invoke `/investigate` |
| Security concern | invoke `/cso` |
| Call flow changed | invoke `/qa` after build |
| InsForge SDK code (DB, auth, storage, AI, realtime, email, payments, functions) | invoke `/insforge` skill first |
| InsForge backend infra (migrations, secrets, deployments, compute, schedules, logs) | invoke `/insforge-cli` skill first |
| InsForge bug / unexpected behavior | invoke `/insforge-debug` skill |
| InsForge 3rd-party integrations (PostHog, etc.) | invoke `/insforge-integrations` skill |

---

## Skill routing

**Use relevant skills whenever possible.** Skills have multi-step workflows, checklists,
and quality gates that produce better results than ad-hoc answers. When in doubt, invoke
the skill — a false positive is cheaper than a false negative.

When the user's request matches an available skill, invoke it via the Skill tool immediately.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke /office-hours
- Strategy, scope, "think bigger", "what should we build" → invoke /plan-ceo-review
- Architecture, "does this design make sense" → invoke /plan-eng-review
- Design system, brand, "how should this look" → invoke /design-consultation
- Design review of a plan → invoke /plan-design-review
- Developer experience of a plan → invoke /plan-devex-review
- "Review everything", full review pipeline → invoke /autoplan
- Bugs, errors, "why is this broken", "wtf", "this doesn't work" → invoke /investigate
- Test the site, find bugs, "does this work" → invoke /qa (or /qa-only for report only)
- Code review, check the diff, "look at my changes" → invoke /review
- Visual polish, design audit, "this looks off" → invoke /design-review
- Developer experience audit, try onboarding → invoke /devex-review
- Ship, deploy, create a PR, "send it" → invoke /ship
- Merge + deploy + verify → invoke /land-and-deploy
- Configure deployment → invoke /setup-deploy
- Post-deploy monitoring → invoke /canary
- Update docs after shipping → invoke /document-release
- Weekly retro, "how'd we do" → invoke /retro
- Second opinion, codex review → invoke /codex
- ANY task not directly core to the call/audio/Twilio/Deepgram pipeline → invoke /codex to offload and preserve Claude Code usage
- Boilerplate, config files, scripts, docs, non-critical utilities → invoke /codex first
- Safety mode, careful mode, lock it down → invoke /careful or /guard
- Restrict edits to a directory → invoke /freeze or /unfreeze
- Upgrade gstack → invoke /gstack-upgrade
- Save progress, "save my work" → invoke /context-save
- Resume, restore, "where was I" → invoke /context-restore
- Security audit, OWASP, "is this secure" → invoke /cso
- Make a PDF, document, publication → invoke /make-pdf
- Launch real browser for QA → invoke /open-gstack-browser
- Import cookies for authenticated testing → invoke /setup-browser-cookies
- Performance regression, page speed, benchmarks → invoke /benchmark
- Review what gstack has learned → invoke /learn
- Tune question sensitivity → invoke /plan-tune
- Code quality dashboard → invoke /health
- Web UI / dashboard work → invoke /design-html or /ui-demo

## InsForge Skill Routing

**MANDATORY: always invoke the relevant skill before writing InsForge code.**

| Task | Skill |
|------|-------|
| DB CRUD, auth, storage, AI, realtime, email, payments, functions (SDK code) | `/insforge` |
| Schema migrations, secrets, deployments, compute, schedules, branches, logs (CLI ops) | `/insforge-cli` |
| Debugging InsForge errors or unexpected behavior | `/insforge-debug` |
| PostHog analytics, 3rd-party integrations via InsForge | `/insforge-integrations` |

**Skill invocation triggers:**
- Writing `insforge.database`, `insforge.auth`, `insforge.storage`, `insforge.ai`, `insforge.realtime`, `insforge.emails`, `insforge.payments`, `insforge.functions` → `/insforge`
- Running `npx @insforge/cli db migrations`, `secrets`, `deployments`, `compute`, `schedules`, `functions deploy`, `branch` → `/insforge-cli`
- InsForge error, 4xx/5xx from InsForge backend, broken auth/query → `/insforge-debug`
- "InsForge MCP's fetch-docs" → invoke both `/insforge` and `/insforge-cli` skills

**Never:**
- Use `@insforge/react`, `@insforge/nextjs`, `@insforge/react-router` (deprecated)
- Install CLI globally (`npm install -g @insforge/cli`) — always `npx`
- Put `api_key` from `.insforge/project.json` in frontend code
- Write AI model IDs from memory — query `ai.configs` table first
- Use `insert({...})` — always `insert([{...}])`
