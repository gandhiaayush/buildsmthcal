-- Cadence: No-show prevention platform for mental health practices
-- Tables: patients, appointments, waitlist, calls

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  preferred_language TEXT DEFAULT 'en',
  appointment_history JSONB DEFAULT '[]',
  no_show_count INTEGER DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  waitlist_slots JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  appointment_type TEXT NOT NULL,
  provider_name TEXT,
  status TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','confirmed','cancelled','no_show','completed')),
  risk_score FLOAT,
  risk_reason TEXT,
  outreach_status TEXT DEFAULT 'pending'
    CHECK (outreach_status IN ('pending','called','confirmed','rescheduled','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  desired_slot TIMESTAMPTZ NOT NULL,
  desired_provider TEXT,
  priority_score FLOAT DEFAULT 0.5,
  notified_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  call_sid TEXT,
  retell_call_id TEXT UNIQUE,
  direction TEXT DEFAULT 'outbound',
  outcome TEXT CHECK (outcome IN ('confirmed','rescheduled','no_answer','declined','failed')),
  transcript TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive','neutral','anxious','hostile')),
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atomic waitlist claim: prevents double-booking race condition
CREATE OR REPLACE FUNCTION claim_waitlist_slot(slot_id UUID)
RETURNS BOOLEAN AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE waitlist SET claimed_at = NOW()
  WHERE id = slot_id AND claimed_at IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Atomic outreach claim: prevents scheduler double-fire
CREATE OR REPLACE FUNCTION claim_appointment_outreach(appt_id UUID)
RETURNS BOOLEAN AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE appointments SET outreach_status = 'called'
  WHERE id = appt_id AND outreach_status = 'pending';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;
