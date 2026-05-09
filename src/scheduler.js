'use strict';

require('dotenv').config();
const cron = require('node-cron');
const db = require('./db');
const { scoreAppointment } = require('./risk-scoring');
const { createRetellCall } = require('./retell');
const logger = require('./logger');

const RISK_THRESHOLD = 0.7;

function startScheduler() {
  // Job 1: Score all upcoming appointments (48h window)
  cron.schedule('0 8 * * *', async () => {
    logger.info('scheduler: starting daily risk scoring');
    let appointments;
    try {
      appointments = await db.listUpcomingAppointments(48);
    } catch (err) {
      logger.error({ err: err.message }, 'scheduler: failed to fetch appointments for scoring');
      return;
    }

    for (const appt of appointments) {
      try {
        const patient = appt.patients || await db.getPatient(appt.patient_id);
        const { score, reason } = scoreAppointment(appt, patient);
        await db.updateAppointmentRisk(appt.id, { risk_score: score, risk_reason: reason });
        logger.info({ appointment_id: appt.id, score }, 'scheduler: risk scored');
      } catch (err) {
        logger.error({ appointment_id: appt.id, err: err.message }, 'scheduler: scoring failed for appointment');
      }
    }
    logger.info({ count: appointments.length }, 'scheduler: risk scoring complete');
  });

  // Job 2: Trigger outreach for high-risk appointments (runs 5 min after scoring)
  cron.schedule('5 8 * * *', async () => {
    logger.info('scheduler: starting high-risk outreach');
    let appointments;
    try {
      appointments = await db.listUpcomingAppointments(48);
    } catch (err) {
      logger.error({ err: err.message }, 'scheduler: failed to fetch appointments for outreach');
      return;
    }

    const highRisk = appointments.filter(
      a => (a.risk_score || 0) >= RISK_THRESHOLD && a.outreach_status === 'pending'
    );

    logger.info({ count: highRisk.length }, 'scheduler: high-risk appointments found');

    for (const appt of highRisk) {
      // Atomic claim — prevents double-fire if scheduler runs twice
      let claimed;
      try {
        claimed = await db.claimAppointmentOutreach(appt.id);
      } catch (err) {
        logger.error({ appointment_id: appt.id, err: err.message }, 'scheduler: claim failed');
        continue;
      }

      if (!claimed) {
        logger.warn({ appointment_id: appt.id }, 'scheduler: appointment already claimed, skipping');
        continue;
      }

      try {
        const patient = appt.patients || await db.getPatient(appt.patient_id);
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

        const { retell_call_id } = await createRetellCall({
          toNumber: patient.phone,
          dynamicVariables: dynamicVars,
          metadata: { appointment_id: appt.id, patient_id: patient.id },
        });

        await db.createCall({
          appointment_id: appt.id,
          patient_id: patient.id,
          retell_call_id,
        });

        await db.updatePatientLastContacted(patient.id);

        logger.info({ appointment_id: appt.id, retell_call_id }, 'scheduler: outreach call initiated');
      } catch (err) {
        logger.error({ appointment_id: appt.id, err: err.message }, 'scheduler: outreach call failed');
        // Roll back claim so it can be retried
        await db.updateAppointmentOutreach(appt.id, 'pending').catch(() => {});
      }
    }

    logger.info('scheduler: outreach complete');
  });

  logger.info('scheduler started (daily 8:00am scoring, 8:05am outreach)');
}

module.exports = { startScheduler };
