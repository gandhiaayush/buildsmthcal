#!/usr/bin/env node
'use strict';

/**
 * One-time setup: creates Retell LLM + Agent for Cadence.
 * Run: node scripts/setup-retell.js
 * Then copy RETELL_AGENT_ID into .env
 */

require('dotenv').config();
const { buildAppointmentReminderPrompt } = require('../src/agent-configs');
const { createRetellLLM, createRetellAgent } = require('../src/retell');

const webhookUrl = `${process.env.TWILIO_WEBHOOK_BASE}/retell-webhook`;

(async () => {
  console.log('Creating Retell LLM (claude-sonnet-4-5)...');
  const llmId = await createRetellLLM(buildAppointmentReminderPrompt());
  console.log('LLM created:', llmId);

  console.log('Creating Retell Agent...');
  const agentId = await createRetellAgent(llmId, webhookUrl);
  console.log('Agent created:', agentId);

  console.log('\n✅ Add to your .env:');
  console.log(`RETELL_AGENT_ID=${agentId}`);
  console.log('\nAlso add your Retell phone number:');
  console.log('RETELL_PHONE_NUMBER=<your_retell_phone_number>');
})().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
