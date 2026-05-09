'use strict';

/**
 * Deterministic, explainable no-show risk scoring.
 * Returns score [0-1] and plain-English reason citing top factors.
 */

function scoreAppointment(appointment, patient) {
  const factors = [];
  let score = 0;

  // Factor: prior no-shows
  const noShows = patient.no_show_count || 0;
  if (noShows >= 5) {
    score += 0.35;
    factors.push(`${noShows} prior no-shows`);
  } else if (noShows >= 3) {
    score += 0.25;
    factors.push(`${noShows} prior no-shows`);
  } else if (noShows >= 1) {
    score += 0.15;
    factors.push(`${noShows} prior no-show${noShows > 1 ? 's' : ''}`);
  }

  // Factor: appointment type
  const type = (appointment.appointment_type || '').toLowerCase();
  if (type.includes('intake') || type.includes('evaluation') || type.includes('assessment')) {
    score += 0.15;
    factors.push('intake/evaluation appointment');
  } else if (type.includes('psych')) {
    score += 0.10;
    factors.push('psychiatry appointment');
  } else if (type.includes('therapy') || type.includes('counsel')) {
    score += 0.05;
  }

  // Factor: day of week
  const scheduledAt = new Date(appointment.scheduled_at);
  const dow = scheduledAt.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  if (dow === 1 || dow === 5) {
    score += 0.10;
    factors.push(dow === 1 ? 'Monday appointment' : 'Friday appointment');
  } else if (dow === 0 || dow === 6) {
    score += 0.05;
  }

  // Factor: time of day
  const hour = scheduledAt.getHours();
  if (hour < 9 || hour >= 16) {
    score += 0.10;
    factors.push(hour < 9 ? 'early morning slot' : 'late afternoon slot');
  }

  // Factor: days since last visit (use no_show_count as proxy if no history)
  const history = patient.appointment_history || [];
  let daysSinceLast = null;
  if (history.length > 0) {
    const lastVisit = new Date(history[history.length - 1]);
    daysSinceLast = (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);
  }
  if (daysSinceLast === null || daysSinceLast > 180) {
    score += 0.15;
    factors.push(daysSinceLast === null ? 'first visit' : `${Math.round(daysSinceLast)}-day gap since last visit`);
  } else if (daysSinceLast > 90) {
    score += 0.10;
    factors.push(`${Math.round(daysSinceLast)}-day gap since last visit`);
  }

  // Factor: lead time to appointment
  const hoursUntil = (scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < 24) {
    score += 0.05;
    factors.push('same-day appointment');
  } else if (hoursUntil > 24 * 14) {
    score += 0.05;
    factors.push('appointment more than 2 weeks out');
  }

  // Clamp to [0, 1]
  score = Math.min(1, Math.max(0, score));

  // Build plain-English reason from top factors
  const reason = factors.length > 0
    ? factors.slice(0, 3).join(', ') + '.'
    : 'Low historical risk indicators.';

  return { score: Math.round(score * 100) / 100, reason };
}

module.exports = { scoreAppointment };
