'use strict';

require('dotenv').config();
const { createClient } = require('@insforge/sdk');

const insforge = createClient({
  baseUrl: process.env.INSFORGE_URL,
  anonKey: process.env.INSFORGE_KEY,
});

const db = insforge.database;

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

async function upsertPatient({ name, phone, preferred_language = 'en', no_show_count = 0 }) {
  const existing = await getPatientByPhone(phone);
  if (existing) {
    const { data, error } = await db
      .from('patients')
      .update({ name, preferred_language, no_show_count })
      .eq('id', existing.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  const { data, error } = await db
    .from('patients')
    .insert([{ name, phone, preferred_language, no_show_count }])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getPatient(id) {
  const { data, error } = await db.from('patients').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function getPatientByPhone(phone) {
  const { data, error } = await db.from('patients').select('*').eq('phone', phone).maybeSingle();
  if (error) throw error;
  return data;
}

async function updatePatientLastContacted(id) {
  const { error } = await db
    .from('patients')
    .update({ last_contacted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

async function upsertAppointment({ patient_id, scheduled_at, appointment_type, provider_name }) {
  const { data, error } = await db
    .from('appointments')
    .insert([{ patient_id, scheduled_at, appointment_type, provider_name }])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getAppointment(id) {
  const { data, error } = await db
    .from('appointments')
    .select('*, patients(name, phone, no_show_count, appointment_history)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listUpcomingAppointments(hoursAhead = 48) {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString();
  const { data, error } = await db
    .from('appointments')
    .select('*, patients(name, phone, no_show_count, appointment_history)')
    .gte('scheduled_at', now)
    .lte('scheduled_at', future)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function updateAppointmentRisk(id, { risk_score, risk_reason }) {
  const { error } = await db
    .from('appointments')
    .update({ risk_score, risk_reason })
    .eq('id', id);
  if (error) throw error;
}

async function updateAppointmentOutreach(id, outreach_status) {
  const { error } = await db
    .from('appointments')
    .update({ outreach_status })
    .eq('id', id);
  if (error) throw error;
}

async function updateAppointmentStatus(id, status) {
  const { error } = await db
    .from('appointments')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

async function updateAppointmentSchedule(id, scheduled_at) {
  const { error } = await db
    .from('appointments')
    .update({ scheduled_at, status: 'rescheduled', outreach_status: 'rescheduled' })
    .eq('id', id);
  if (error) throw error;
}

async function claimAppointmentOutreach(id) {
  const { data, error } = await db.rpc('claim_appointment_outreach', { appt_id: id });
  if (error) throw error;
  return data === true;
}

async function getNextAvailableSlots(provider_name, n = 3) {
  const now = new Date().toISOString();
  const query = db
    .from('appointments')
    .select('id, scheduled_at, provider_name')
    .eq('status', 'scheduled')
    .eq('outreach_status', 'pending')
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(n);
  if (provider_name) query.eq('provider_name', provider_name);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function listAllAppointments() {
  const { data, error } = await db
    .from('appointments')
    .select('*, patients(name, phone)')
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

async function addToWaitlist({ patient_id, desired_slot, desired_provider, priority_score = 0.5 }) {
  const { data, error } = await db
    .from('waitlist')
    .insert([{ patient_id, desired_slot, desired_provider, priority_score }])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getWaitlistForSlot(desired_slot, desired_provider) {
  const slotTime = new Date(desired_slot);
  const from = new Date(slotTime.getTime() - 2 * 3600 * 1000).toISOString();
  const to = new Date(slotTime.getTime() + 2 * 3600 * 1000).toISOString();
  const query = db
    .from('waitlist')
    .select('*, patients(name, phone)')
    .gte('desired_slot', from)
    .lte('desired_slot', to)
    .is('claimed_at', null)
    .order('priority_score', { ascending: false });
  if (desired_provider) query.eq('desired_provider', desired_provider);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function claimWaitlistSlot(id) {
  const { data, error } = await db.rpc('claim_waitlist_slot', { slot_id: id });
  if (error) throw error;
  return data === true;
}

async function listWaitlist() {
  const { data, error } = await db
    .from('waitlist')
    .select('*, patients(name, phone)')
    .order('priority_score', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

async function createCall({ appointment_id, patient_id, retell_call_id }) {
  const { data, error } = await db
    .from('calls')
    .insert([{ appointment_id, patient_id, retell_call_id }])
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function updateCall(id, { outcome, transcript, sentiment, duration_seconds, call_sid }) {
  const update = {};
  if (outcome !== undefined) update.outcome = outcome;
  if (transcript !== undefined) update.transcript = transcript;
  if (sentiment !== undefined) update.sentiment = sentiment;
  if (duration_seconds !== undefined) update.duration_seconds = duration_seconds;
  if (call_sid !== undefined) update.call_sid = call_sid;
  const { error } = await db.from('calls').update(update).eq('id', id);
  if (error) throw error;
}

async function getCallByRetellCallId(retell_call_id) {
  const { data, error } = await db
    .from('calls')
    .select('*')
    .eq('retell_call_id', retell_call_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function countActiveCalls() {
  const { count, error } = await db
    .from('calls')
    .select('*', { count: 'exact', head: true })
    .is('outcome', null);
  if (error) throw error;
  return count || 0;
}

async function listRecentCalls(limit = 20) {
  const { data, error } = await db
    .from('calls')
    .select('*, patients(name, phone), appointments(appointment_type, provider_name, scheduled_at)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

module.exports = {
  upsertPatient,
  getPatient,
  getPatientByPhone,
  updatePatientLastContacted,
  upsertAppointment,
  getAppointment,
  listUpcomingAppointments,
  listAllAppointments,
  updateAppointmentRisk,
  updateAppointmentOutreach,
  updateAppointmentStatus,
  updateAppointmentSchedule,
  claimAppointmentOutreach,
  getNextAvailableSlots,
  addToWaitlist,
  getWaitlistForSlot,
  claimWaitlistSlot,
  listWaitlist,
  createCall,
  updateCall,
  getCallByRetellCallId,
  countActiveCalls,
  listRecentCalls,
};
