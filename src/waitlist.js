'use strict';

const db = require('./db');
const { createRetellCall } = require('./retell');
const { buildAppointmentReminderPrompt } = require('./agent-configs');
const logger = require('./logger');

/**
 * When a slot opens (cancellation, no-show, failed confirm):
 * find the highest-priority waitlist match and trigger a Retell call.
 * Atomic claim prevents double-booking.
 */
async function backfillWaitlist(openedSlot, provider) {
  const candidates = await db.getWaitlistForSlot(openedSlot, provider);
  if (!candidates.length) {
    logger.info({ openedSlot, provider }, 'waitlist: no candidates for slot');
    return { claimed: false };
  }

  for (const entry of candidates) {
    const claimed = await db.claimWaitlistSlot(entry.id);
    if (!claimed) continue; // race — another process claimed it

    const patient = await db.getPatient(entry.patient_id);
    if (!patient) {
      logger.warn({ waitlistId: entry.id }, 'waitlist: patient not found after claim');
      continue;
    }

    logger.info({ waitlistId: entry.id, patientId: patient.id }, 'waitlist: slot claimed, triggering call');

    const slots = await db.getNextAvailableSlots(provider, 3);
    const dynamicVars = {
      patient_name: patient.name,
      appointment_type: 'your appointment',
      provider_name: provider || 'your provider',
      scheduled_at: new Date(openedSlot).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }),
      available_slots: slots.length > 0
        ? slots.map((s, i) => `${i + 1}. ${new Date(s.scheduled_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`).join('\n')
        : 'Please call us for available times.',
    };

    try {
      const { retell_call_id } = await createRetellCall({
        toNumber: patient.phone,
        dynamicVariables: dynamicVars,
      });

      await db.createCall({
        patient_id: patient.id,
        retell_call_id,
      });

      await db.updatePatientLastContacted(patient.id);

      return { claimed: true, patientId: patient.id, retellCallId: retell_call_id };
    } catch (err) {
      logger.error({ err: err.message, patientId: patient.id }, 'waitlist: failed to initiate Retell call');
      return { claimed: false, error: err.message };
    }
  }

  return { claimed: false };
}

module.exports = { backfillWaitlist };
