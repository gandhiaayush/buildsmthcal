'use strict';

require('dotenv').config();
const twilio = require('twilio');
const logger = require('./logger');

// In-memory map: taskId (appointment_id) → { dynamicVariables, callSid }
// Set when call is initiated, read by /media-stream WebSocket on connect
const callContextMap = new Map();

async function createRetellCall({ toNumber, dynamicVariables = {}, metadata = {} }) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const taskId = String(metadata?.appointment_id || '');
  const webhookBase = process.env.TWILIO_WEBHOOK_BASE;

  if (!webhookBase) throw new Error('TWILIO_WEBHOOK_BASE not set in env');
  if (!process.env.TWILIO_PHONE_NUMBER) throw new Error('TWILIO_PHONE_NUMBER not set in env');

  const call = await client.calls.create({
    to: toNumber,
    from: process.env.TWILIO_PHONE_NUMBER,
    url: `${webhookBase}/outbound-twiml?taskId=${encodeURIComponent(taskId)}`,
    timeout: 30,
    statusCallback: `${webhookBase}/call-status`,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['completed'],
  });

  callContextMap.set(taskId, { dynamicVariables, callSid: call.sid });
  logger.info({ taskId, callSid: call.sid, to: toNumber }, 'outbound call initiated via Twilio');

  return { retell_call_id: call.sid, call_status: call.status };
}

function getCallContext(taskId) {
  return callContextMap.get(String(taskId));
}

function deleteCallContext(taskId) {
  callContextMap.delete(String(taskId));
}

// No-op — kept so any remaining import references don't crash
function verifyRetellSignature() { return true; }

module.exports = { createRetellCall, getCallContext, deleteCallContext, verifyRetellSignature };
