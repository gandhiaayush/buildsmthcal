'use strict';

/**
 * Retell AI client.
 * Docs verified from: https://docs.retellai.com/api-references/
 *
 * Auth: Bearer token in Authorization header.
 * Create call: POST https://api.retellai.com/v2/create-phone-call
 * Dynamic vars: retell_llm_dynamic_variables object injected into {{variable}} placeholders in prompt.
 * Webhook events: call_started, call_ended, call_analyzed
 * Signature verification: x-retell-signature header, raw body + API key
 */

require('dotenv').config();
const logger = require('./logger');

const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_BASE = 'https://api.retellai.com';

async function retellRequest(method, path, body) {
  const res = await fetch(`${RETELL_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Retell API ${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

/**
 * Create a Retell LLM with the appointment reminder prompt.
 * Returns llm_id to use when creating the agent.
 */
async function createRetellLLM(systemPrompt) {
  const data = await retellRequest('POST', '/create-retell-llm', {
    general_prompt: systemPrompt,
    model: 'claude-4.6-sonnet',
    start_speaker: 'agent',
    begin_message: "Hi, this is Cadence calling from the clinic. May I speak with {{patient_name}}?",
    default_dynamic_variables: {
      patient_name: 'the patient',
      appointment_type: 'your appointment',
      provider_name: 'your provider',
      scheduled_at: 'your scheduled time',
      available_slots: 'Please call us for available times.',
    },
  });
  logger.info({ llm_id: data.llm_id }, 'retell: LLM created');
  return data.llm_id;
}

/**
 * Create the Cadence agent referencing the LLM.
 * Returns agent_id to store in RETELL_AGENT_ID env var.
 */
async function createRetellAgent(llmId, webhookUrl) {
  const data = await retellRequest('POST', '/create-agent', {
    agent_name: 'Cadence',
    response_engine: { type: 'retell-llm', llm_id: llmId },
    voice_id: 'cartesia-Cleo',
    webhook_url: webhookUrl,
    max_call_duration_ms: 300000, // 5 min max
    language: 'en-US',
  });
  logger.info({ agent_id: data.agent_id }, 'retell: agent created');
  return data.agent_id;
}

/**
 * Initiate an outbound phone call via Retell.
 * dynamicVariables: { patient_name, appointment_type, provider_name, scheduled_at, available_slots }
 */
async function createRetellCall({ toNumber, dynamicVariables = {}, metadata = {} }) {
  const agentId = process.env.RETELL_AGENT_ID;
  const fromNumber = process.env.RETELL_PHONE_NUMBER;

  if (!agentId) throw new Error('RETELL_AGENT_ID not set in env');
  if (!fromNumber) throw new Error('RETELL_PHONE_NUMBER not set in env');

  const payload = {
    from_number: fromNumber,
    to_number: toNumber,
    override_agent_id: agentId,
    retell_llm_dynamic_variables: dynamicVariables,
    metadata,
  };

  const data = await retellRequest('POST', '/v2/create-phone-call', payload);
  logger.info({ retell_call_id: data.call_id, to: toNumber }, 'retell: call created');
  return { retell_call_id: data.call_id, call_status: data.call_status };
}

/**
 * Fetch call details (transcript, analysis) after call ends.
 */
async function getRetellCall(callId) {
  return retellRequest('GET', `/v2/get-call/${callId}`);
}

/**
 * Verify Retell webhook signature.
 * Uses raw request body (Buffer) + API key.
 * Returns true if valid.
 *
 * Retell signs with HMAC-SHA256: signature = HMAC(apiKey, rawBody)
 */
function verifyRetellSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const crypto = require('crypto');
  const expected = crypto
    .createHmac('sha256', RETELL_API_KEY)
    .update(rawBody)
    .digest('hex');
  return expected === signatureHeader;
}

module.exports = {
  createRetellLLM,
  createRetellAgent,
  createRetellCall,
  getRetellCall,
  verifyRetellSignature,
};
