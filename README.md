# No-Show Predictor

AI-native scheduling intelligence for healthcare clinics. Ingests appointment history, scores patients by no-show risk, automates pre-visit outreach, and gives clinic staff an intelligent daily dashboard — with zero front-desk involvement.

## Features

| Feature | Description |
|---|---|
| **Risk Score Dashboard** | Upload a CSV and get color-coded risk scores (low/medium/high) with plain-language reasons per patient |
| **Insurance Pre-Verification** | Cross-references each patient's insurance against the clinic's accepted providers — flags issues before the patient arrives |
| **Referral Gap Detector** | Detects missing or expired referrals and authorization numbers from CSV data |
| **Appointment Prep Push** | Two-stage preparation instructions (1 week + 2 days before) sent via email for each procedure type |
| **Telehealth Pivot** | Auto-triggers a same-day telehealth offer email to high-risk patients who haven't confirmed by morning |
| **Morning Briefing** | Aggregated daily summary: high-risk count, insurance issues, referral gaps, revenue at risk |
| **Revenue Impact Dashboard** | Before/after no-show rate chart + post-visit outcome logger that tracks model accuracy |
| **Settings** | Clinic name, average visit value, accepted insurance list, email sender config |

## Architecture

This repo is the **Frontend + API Layer**. It integrates with two separate backend services:

```
┌─────────────────────────────────────────────────┐
│              FRONTEND + API LAYER               │  ← this repo
│  Next.js 14 · Tailwind · shadcn/ui              │
└──────────────┬──────────────────────────────────┘
               │  REST via Next.js /api/ routes
               │
   ┌───────────┴────────────┐    ┌─────────────────────────┐
   │  BACKEND ENGINE        │    │  VOICE + OVERBOOKING    │
   │  (separate repo)       │    │  ENGINE (separate repo) │
   │  Risk score model      │    │  Twilio voice agents    │
   │  CSV parsing           │    │  Overbooking algorithm  │
   └────────────────────────┘    └─────────────────────────┘
```

All backend calls go through Next.js API routes — the browser never hits the engines directly. If an engine is unreachable, every endpoint falls back to deterministic mock data so the UI never breaks.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **CSV Parsing:** papaparse
- **Charts:** Recharts
- **Email:** Resend
- **State:** React useState / useReducer

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template and fill in your keys
cp .env.local.example .env.local

# Start dev server
npm run dev
```

App runs at `http://localhost:3000`.

## Environment Variables

Create `.env.local` with:

```bash
RESEND_API_KEY=            # get from resend.com
BACKEND_ENGINE_URL=http://localhost:8000   # risk score + CSV engine
VOICE_ENGINE_URL=http://localhost:8001     # voice + overbooking engine
NEXT_PUBLIC_CLINIC_NAME="Demo Clinic"
NEXT_PUBLIC_AVG_VISIT_VALUE=250
```

All backends are optional — mock fallbacks are always active.

## CSV Format

Upload a `.csv` file with these columns (snake_case):

| Column | Required | Description |
|---|---|---|
| `patient_id` | Yes | Unique patient identifier |
| `patient_name` | Yes | Full name |
| `appointment_time` | Yes | ISO 8601 datetime |
| `appointment_type` | Yes | `appendix_removal`, `heart_surgery`, `brain_surgery`, `ultrasound`, or any string |
| `doctor_name` | Yes | Attending physician |
| `insurance_provider` | No | Used for pre-verification |
| `prior_no_shows` | No | Number of prior no-shows |
| `confirmed` | No | `true` / `false` |
| `referral_source` | No | Referring doctor name |

A sample CSV can be downloaded from the Upload page.

## Demo Day Sequence (90 seconds)

1. Upload CSV → risk scores populate with color-coded rows and reasons
2. Point out insurance flags and referral gap count inline
3. Trigger a live prep push email (show the sent email on phone)
4. Show a high-risk patient → trigger telehealth pivot email
5. Show revenue dashboard: before vs. after no-show rate
6. Show morning briefing card on dashboard home

## Contributors

- Aayush Gandhi
- Dhruva Vutukury
- Shivansh Bansal
