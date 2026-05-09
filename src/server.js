'use strict';

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { createRetellCall, getRetellCall, verifyRetellSignature } = require('./retell');
const { parseAndIngest } = require('./csv-parser');
const { backfillWaitlist } = require('./waitlist');
const { scoreAppointment } = require('./risk-scoring');
const logger = require('./logger');

const app = express();
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

// Raw body needed for Retell webhook signature verification
app.use('/retell-webhook', express.raw({ type: '*/*' }));

// JSON + urlencoded for everything else
app.use((req, res, next) => {
  if (req.path === '/retell-webhook') return next();
  express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: false }));

// Multipart for CSV upload (manual handling via buffer)
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.static(path.join(process.cwd(), 'public')));

// ---------------------------------------------------------------------------
// Sentiment classification (deterministic, no LLM)
// ---------------------------------------------------------------------------

function classifySentiment(transcript) {
  if (!transcript) return 'neutral';
  const t = transcript.toLowerCase();
  if (/won't|refuse|annoyed|stop calling|leave me alone|not interested/.test(t)) return 'hostile';
  if (/nervous|scared|worried|anxious|overwhelmed|stressed/.test(t)) return 'anxious';
  if (/yes|sure|sounds good|great|thank|perfect|absolutely|looking forward/.test(t)) return 'positive';
  return 'neutral';
}

// ---------------------------------------------------------------------------
// Retell call outcome classification from disconnection_reason
// ---------------------------------------------------------------------------

function classifyOutcome(callAnalysis, disconnectionReason) {
  if (callAnalysis?.in_voicemail) return 'no_answer';
  if (callAnalysis?.call_successful === false) return 'declined';
  if (disconnectionReason === 'dial_failed' || disconnectionReason === 'dial_no_answer') return 'no_answer';
  if (disconnectionReason === 'error_infer_no_user_input') return 'no_answer';
  const summary = (callAnalysis?.call_summary || '').toLowerCase();
  if (summary.includes('confirm') || summary.includes('attend') || summary.includes('will come')) return 'confirmed';
  if (summary.includes('reschedul')) return 'rescheduled';
  if (summary.includes('decline') || summary.includes('cancel') || summary.includes('won\'t')) return 'declined';
  return 'confirmed'; // default: assume confirmed if call completed without failure
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health
app.get('/api/health', async (_req, res) => {
  const activeCalls = await db.countActiveCalls().catch(() => 0);
  res.json({ status: 'ok', activeCalls, timestamp: new Date().toISOString() });
});

// CSV Upload + Risk Scoring
app.post('/api/upload-csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded. Send as multipart field named "file".' });
  try {
    const result = await parseAndIngest(req.file.buffer);
    res.json(result);
  } catch (err) {
    logger.error({ err: err.message }, 'upload-csv failed');
    res.status(500).json({ error: err.message });
  }
});

// List upcoming appointments
app.get('/api/appointments', async (req, res) => {
  const hours = parseInt(req.query.hours || '48', 10);
  try {
    const appts = await db.listUpcomingAppointments(hours);
    res.json(appts);
  } catch (err) {
    logger.error({ err: err.message }, 'list appointments failed');
    res.status(500).json({ error: err.message });
  }
});

// All appointments (no time filter)
app.get('/api/appointments/all', async (_req, res) => {
  try {
    const appts = await db.listAllAppointments();
    res.json(appts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single appointment
app.get('/api/appointments/:id', async (req, res) => {
  try {
    const appt = await db.getAppointment(req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger outbound Retell call
app.post('/api/calls/trigger', async (req, res) => {
  const { appointment_id } = req.body;
  if (!appointment_id) return res.status(400).json({ error: 'appointment_id required' });

  try {
    const appt = await db.getAppointment(appointment_id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const patient = appt.patients;
    if (!patient?.phone) return res.status(400).json({ error: 'Patient has no phone number' });

    const slots = await db.getNextAvailableSlots(appt.provider_name, 3);

    const dynamicVars = {
      patient_name: patient.name,
      appointment_type: appt.appointment_type,
      provider_name: appt.provider_name || 'your provider',
      scheduled_at: new Date(appt.scheduled_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }),
      available_slots: slots.length > 0
        ? slots.map((s, i) => `${i + 1}. ${new Date(s.scheduled_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`).join('\n')
        : 'Please call us for available times.',
    };

    const { retell_call_id, call_status } = await createRetellCall({
      toNumber: patient.phone,
      dynamicVariables: dynamicVars,
      metadata: { appointment_id, patient_id: appt.patient_id },
    });

    const callRecord = await db.createCall({
      appointment_id,
      patient_id: appt.patient_id,
      retell_call_id,
    });

    await db.updateAppointmentOutreach(appointment_id, 'called');
    await db.updatePatientLastContacted(appt.patient_id);

    logger.info({ appointment_id, retell_call_id }, 'call triggered');
    res.json({ call_id: callRecord.id, retell_call_id, call_status });
  } catch (err) {
    logger.error({ appointment_id, err: err.message }, 'call trigger failed');
    res.status(500).json({ error: err.message });
  }
});

// List recent calls
app.get('/api/calls', async (_req, res) => {
  try {
    const calls = await db.listRecentCalls(50);
    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Waitlist: register
app.post('/api/waitlist/register', async (req, res) => {
  const { patient_id, desired_slot, desired_provider, priority_score } = req.body;
  if (!patient_id || !desired_slot) return res.status(400).json({ error: 'patient_id and desired_slot required' });
  try {
    const entry = await db.addToWaitlist({ patient_id, desired_slot, desired_provider, priority_score });
    res.json(entry);
  } catch (err) {
    logger.error({ err: err.message }, 'waitlist register failed');
    res.status(500).json({ error: err.message });
  }
});

// Waitlist: manual backfill trigger
app.post('/api/waitlist/backfill', async (req, res) => {
  const { slot, provider } = req.body;
  if (!slot) return res.status(400).json({ error: 'slot required' });
  try {
    const result = await backfillWaitlist(slot, provider);
    res.json(result);
  } catch (err) {
    logger.error({ err: err.message }, 'waitlist backfill failed');
    res.status(500).json({ error: err.message });
  }
});

// Waitlist: list all
app.get('/api/waitlist', async (_req, res) => {
  try {
    const entries = await db.listWaitlist();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Retell webhook — receives call events
// Docs: call_started, call_ended, call_analyzed events
// Signature: x-retell-signature header, HMAC-SHA256(apiKey, rawBody)
// ---------------------------------------------------------------------------

app.post('/retell-webhook', async (req, res) => {
  const rawBody = req.body; // Buffer (raw middleware applied above)
  const signature = req.headers['x-retell-signature'];

  if (signature && !verifyRetellSignature(rawBody, signature)) {
    logger.warn('retell-webhook: invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { event: eventType, call } = event;
  logger.info({ eventType, call_id: call?.call_id }, 'retell-webhook received');

  res.sendStatus(200); // Acknowledge immediately

  // Process async — don't block Retell
  setImmediate(async () => {
    try {
      if (eventType === 'call_analyzed' && call?.call_id) {
        const callRecord = await db.getCallByRetellCallId(call.call_id);
        if (!callRecord) {
          logger.warn({ retell_call_id: call.call_id }, 'retell-webhook: no matching call record');
          return;
        }

        const analysis = call.call_analysis || {};
        const transcript = call.transcript || '';
        const startTs = call.start_timestamp;
        const endTs = call.end_timestamp;
        const durationSeconds = (startTs && endTs) ? Math.round((endTs - startTs) / 1000) : null;

        const outcome = classifyOutcome(analysis, call.disconnection_reason);

        // Map Retell sentiment to our schema
        const retellSentiment = (analysis.user_sentiment || '').toLowerCase();
        const sentiment = retellSentiment === 'negative' ? 'hostile'
          : retellSentiment === 'positive' ? 'positive'
          : classifySentiment(transcript);

        await db.updateCall(callRecord.id, {
          outcome,
          transcript,
          sentiment,
          duration_seconds: durationSeconds,
        });

        // Update appointment based on outcome
        if (callRecord.appointment_id) {
          if (outcome === 'confirmed') {
            await db.updateAppointmentOutreach(callRecord.appointment_id, 'confirmed');
            await db.updateAppointmentStatus(callRecord.appointment_id, 'confirmed');
          } else if (outcome === 'rescheduled') {
            await db.updateAppointmentOutreach(callRecord.appointment_id, 'rescheduled');
          } else if (outcome === 'no_answer' || outcome === 'declined') {
            await db.updateAppointmentOutreach(callRecord.appointment_id, 'failed');
            // Trigger waitlist backfill — this slot may open up
            const appt = await db.getAppointment(callRecord.appointment_id);
            if (appt) {
              await backfillWaitlist(appt.scheduled_at, appt.provider_name).catch(err =>
                logger.warn({ err: err.message }, 'waitlist backfill after failed call failed')
              );
            }
          }
        }

        logger.info({ call_id: call.call_id, outcome, sentiment }, 'retell-webhook: call_analyzed processed');
      }
    } catch (err) {
      logger.error({ err: err.message, call_id: call?.call_id }, 'retell-webhook: processing error');
    }
  });
});

// ---------------------------------------------------------------------------
// Static fallback
// ---------------------------------------------------------------------------

app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

module.exports = { app, server };
