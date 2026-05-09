# No-Show Predictor — CLAUDE.md
> AI-native scheduling intelligence platform for healthcare clinics.
> This file is the source of truth for Claude Code. Read it fully before writing any code.

---

## What We're Building

A full-stack web application that ingests appointment history, scores patients by no-show risk, automates pre-visit outreach, and gives clinic staff an intelligent daily dashboard — with zero front-desk involvement in the loop.

---

## Architecture Overview

This project is split across **three separate codebases** that must integrate cleanly. You are building the **Frontend + API Layer**. The other two are being built independently.

```
┌─────────────────────────────────────────────────┐
│              FRONTEND + API LAYER               │  ← YOU ARE BUILDING THIS
│  Next.js · Tailwind · shadcn/ui                 │
│  - UI shell (dashboard, settings, billing)      │
│  - CSV upload + display layer                   │
│  - Insurance pre-verification UI                │
│  - Referral gap display                         │
│  - Appointment prep push UI                     │
│  - Email server (Resend)                        │
│  - Morning briefing display                     │
│  - Revenue impact dashboard                     │
└──────────────┬──────────────────────────────────┘
               │  REST API contracts (defined below)
               │
   ┌───────────┴────────────┐    ┌─────────────────────────┐
   │  BACKEND ENGINE        │    │  VOICE + OVERBOOKING    │
   │  (separate repo)       │    │  ENGINE (separate repo) │
   │                        │    │                         │
   │  - Risk score model    │    │  - Twilio voice agents  │
   │  - CSV parsing logic   │    │  - Overbooking algo     │
   │  - Outcome correlation │    │  - Waitlist callback    │
   │  - Slot pattern learner│    │  - Multilingual support │
   └────────────────────────┘    └─────────────────────────┘
```

### Integration Principle
- The frontend **never calls the backend engines directly from the browser**
- All cross-engine calls go through **Next.js API routes** (`/api/...`) which act as the integration layer
- Each engine exposes a REST interface; the contracts are defined below
- Use **mock responses** for any engine endpoint that isn't ready yet — the UI should never be blocked by backend status

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Email | Resend |
| CSV Parsing | papaparse |
| Charts | Recharts |
| State | React useState / useReducer (no external state lib) |
| API Routes | Next.js `/app/api/` handlers |
| Env Vars | `.env.local` |

---

## Project Structure

```
/app
  /dashboard          → main clinic dashboard (appointments, risk scores)
  /upload             → CSV upload page
  /insurance          → insurance pre-verification
  /referrals          → referral gap detector
  /prep               → appointment prep push
  /briefing           → morning staff briefing
  /revenue            → revenue impact dashboard
  /settings           → clinic settings
  /api
    /risk-score       → proxies to Backend Engine
    /insurance-check  → insurance verification logic
    /referral-check   → referral gap logic
    /send-prep        → triggers prep push emails via Resend
    /telehealth-pivot → sends telehealth offer email
    /morning-brief    → aggregates day's risk data for briefing
    /voice-trigger    → proxies to Voice + Overbooking Engine
    /update-csv       → post-visit CSV update handler
/components
  /ui                 → shadcn primitives
  /RiskScoreTable     → displays risk scores with reasons
  /PatientCard        → per-patient summary card
  /PrepTimeline       → two-stage prep instruction display
  /MorningBriefCard   → daily briefing summary
  /RevenueChart       → recharts revenue impact visualization
/lib
  /mock-data.ts       → mock responses for unbuilt engine endpoints
  /api-contracts.ts   → TypeScript types for all API interfaces
  /insurance-list.ts  → hardcoded accepted insurance providers
  /prep-instructions.ts → procedure-to-instruction map
  /email-templates/   → Resend email templates
/types
  index.ts            → shared types used across frontend and API routes
```

---

## API Contracts

These are the agreed interfaces between the frontend and the two backend engines.
**Stub all of these with mock data if the backend isn't ready — the UI must never break.**

### Backend Engine (Risk Scores)

**POST** `/api/risk-score`
```ts
// Request
{ appointments: AppointmentRow[] }  // parsed from uploaded CSV

// Response
{
  scores: {
    patient_id: string
    patient_name: string
    appointment_time: string
    risk_score: number        // 0.0 – 1.0
    risk_level: "low" | "medium" | "high"
    reasons: string[]         // e.g. ["Last-minute booking", "2 prior no-shows"]
    confidence: number        // 0.0 – 1.0
  }[]
}
```

**POST** `/api/update-csv`
```ts
// Request — post-visit outcome logging
{
  patient_id: string
  showed_up: boolean
  rescheduled: boolean
  new_appointment_time?: string
  notes?: string
}

// Response
{ success: boolean }
```

### Voice + Overbooking Engine

**POST** `/api/voice-trigger`
```ts
// Request
{
  patient_id: string
  phone_number: string
  call_type: "reminder" | "reschedule" | "waitlist" | "amnesty"
  language?: string           // defaults to "en"
  risk_level: "low" | "medium" | "high"
}

// Response
{ call_sid: string, status: "queued" | "initiated" | "failed" }
```

**POST** `/api/overbooking-check`
```ts
// Request
{ date: string, scores: RiskScore[] }

// Response
{
  slots: {
    appointment_id: string
    overbook_recommended: boolean
    backup_patient_id?: string
  }[]
}
```

---

## Data Types

```ts
// /types/index.ts — canonical shared types

export type AppointmentRow = {
  patient_id: string
  patient_name: string
  appointment_time: string       // ISO string
  appointment_type: ProcedureType
  doctor_name: string
  referral_source?: string
  insurance_provider?: string
  prior_no_shows?: number
  confirmed?: boolean
  language_preference?: string
  caregiver_contact?: string
}

export type ProcedureType =
  | "appendix_removal"
  | "heart_surgery"
  | "brain_surgery"
  | "ultrasound"
  | string                       // extensible for future procedure types

export type RiskScore = {
  patient_id: string
  patient_name: string
  appointment_time: string
  risk_score: number
  risk_level: "low" | "medium" | "high"
  reasons: string[]
  confidence: number
}

export type InsuranceStatus = {
  patient_id: string
  insurance_provider: string
  verified: boolean
  flag_reason?: string
}

export type ReferralRecord = {
  patient_id: string
  referring_doctor: string
  referral_date: string
  authorization_number?: string
  status: "complete" | "missing" | "expired"
}

export type PrepInstruction = {
  procedure: ProcedureType
  one_week_before: string[]
  two_days_before: string[]
}
```

---

## Feature Specifications

### 1. CSV Upload + Risk Score Display
- Accept `.csv` files via drag-and-drop or file picker
- Parse client-side with `papaparse`, validate required columns exist
- POST parsed rows to `/api/risk-score` → proxied to Backend Engine
- While loading: skeleton table with "Analyzing appointments..."
- On response: render `RiskScoreTable` — color-coded rows (green/yellow/red), plain-language reasons, confidence badge
- **Mock fallback**: if backend engine is unreachable, use deterministic mock scores from `/lib/mock-data.ts`

### 2. Insurance Pre-Verification
- Accepted insurance list hardcoded in `/lib/insurance-list.ts`:
  - Aetna, BlueCross BlueShield, Cigna, Humana, Kaiser, Medicare, Medicaid, UnitedHealthcare
- On CSV upload, cross-reference each patient's `insurance_provider` field against the list
- Display inline per patient: ✅ verified · 🚩 not on accepted list · ⚠️ missing
- Flag reason shown on hover: "Insurance not in accepted list" / "No insurance on file"

### 3. Referral Gap Detector
- Parse `referral_source` and `doctor_name` from CSV rows
- Display per patient: referring doctor, referral date, authorization number if present
- Status: `complete` / `missing` / `expired` — derived from CSV fields, no external API needed
- Summary banner at top of referrals view: "3 of 12 appointments have referral gaps"

### 4. Appointment Prep Push
Procedure-to-instruction map in `/lib/prep-instructions.ts`:

```
appendix_removal:
  1 week before:
    - Stop blood thinners and aspirin (confirm with doctor)
    - Arrange transportation — you cannot drive after surgery
    - No food or drink for 12 hours before procedure
  2 days before:
    - Confirm your ride is arranged
    - Prepare an overnight bag (2–3 day stay likely)
    - Review and sign consent forms if not done

heart_surgery:
  1 week before:
    - Stop specific medications as directed by cardiologist
    - Follow cardiac diet — no high-sodium foods
    - No alcohol or tobacco
  2 days before:
    - Nothing by mouth after midnight
    - Shower with surgical soap the night before
    - Confirm caregiver is available for 4–6 week recovery

brain_surgery:
  1 week before:
    - Full medication review with neurologist
    - Arrange 2-week post-op recovery support at home
    - No supplements, herbal remedies, or blood thinners
  2 days before:
    - Nothing by mouth after midnight
    - Remove nail polish, jewelry, and piercings
    - Confirm escort — you will not be able to drive

ultrasound:
  1 week before:
    - No special preparation typically required
    - Stay well hydrated leading up to the appointment
  2 days before:
    - If abdominal ultrasound: drink 32oz of water 1 hour before, do not urinate
    - Wear loose, comfortable clothing
    - No special diet restrictions
```

- UI flow: select patient → auto-detect procedure from CSV → preview two-stage instructions → send email via Resend
- Personalize email with patient name and clinic branding

### 5. Telehealth Pivot Email
- Triggered for any patient with `risk_level: "high"` who has not confirmed by 8am day-of
- `/api/telehealth-pivot` sends email via Resend
- Email: "We noticed you haven't confirmed your [date] appointment. A same-day telehealth option is available. Click to confirm."
- Log sent status; show "Telehealth offer sent" badge on patient card

### 6. Morning Staff Briefing
- Aggregates day's risk scores, overbooking flags, insurance issues, and referral gaps
- Displayed as a card summary: high-risk count, flagged gaps, estimated revenue at risk
- Revenue estimate formula: `high_risk_count × average_visit_value` (default $250, configurable in settings)
- Text briefing only for hackathon (no audio)

### 7. Revenue Impact Dashboard
- Recharts chart showing: no-show rate before vs. after, revenue recovered, lost revenue
- Use mock historical data for the "before" baseline — make it look real for the demo
- CSV update loop: after visits, staff marks each appointment showed/no-showed in UI
- Prediction accuracy stat: "Your model was X% accurate this week" — calculated from update-csv logs

### 8. Settings Page
- Clinic name
- Average visit value (used in revenue calc)
- Accepted insurance list (editable)
- Email sender address (Resend config)

---

## Environment Variables

```bash
# .env.local
RESEND_API_KEY=
BACKEND_ENGINE_URL=http://localhost:8000   # Risk score + CSV engine
VOICE_ENGINE_URL=http://localhost:8001     # Voice + overbooking engine
NEXT_PUBLIC_CLINIC_NAME="Demo Clinic"
NEXT_PUBLIC_AVG_VISIT_VALUE=250
```

---

## Mock Data Strategy

When a backend engine endpoint is unavailable, **always fall back to mock data**.
Mocks live in `/lib/mock-data.ts`. Never show a broken state to the judges.

```ts
// Deterministic mock risk score based on patient data
export const mockRiskScore = (patient: AppointmentRow): RiskScore => ({
  patient_id: patient.patient_id,
  patient_name: patient.patient_name,
  appointment_time: patient.appointment_time,
  risk_score: patient.prior_no_shows ? 0.82 : 0.34,
  risk_level: patient.prior_no_shows ? "high" : "low",
  reasons: patient.prior_no_shows
    ? ["2 prior no-shows", "Last-minute booking", "Unconfirmed insurance"]
    : ["First appointment", "Insurance verified", "Confirmed 48hrs out"],
  confidence: 0.84
})
```

---

## Integration Checklist (Before Merging With Other Teams)

- [ ] Confirm base URLs and port assignments with backend team
- [ ] Confirm CSV column name format (this repo assumes snake_case)
- [ ] Confirm risk score response shape matches `/types/index.ts` exactly
- [ ] Confirm voice engine `call_type` enum values with voice team
- [ ] Run one end-to-end test with a real 20-row CSV before demo

---

## Demo Day Sequence (90-Second Loop)

1. Upload CSV → risk scores populate with color-coded rows and plain-language reasons
2. Point out insurance flags and referral gap count inline
3. Trigger one live prep push email (show the sent email on phone)
4. Show a high-risk patient → trigger telehealth pivot email
5. Show revenue dashboard: before vs. after no-show rate
6. Show morning briefing card on dashboard home

---

## Scope Cuts — Do Not Build for Hackathon

These are roadmap features only. Do not implement:
- No-show amnesty mode
- Caregiver loop notifications
- Barrier resolution engine (Lyft Health integration)
- Multilingual email (voice engine handles multilingual; email is English only)
- Sentiment detection (voice engine's responsibility)
- Auth / login system
- Outcome correlation engine (show static mock chart only)

---

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. The
skill has multi-step workflows, checklists, and quality gates that produce better
results than an ad-hoc answer. When in doubt, invoke the skill. A false positive is
cheaper than a false negative.

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