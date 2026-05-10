require('dotenv').config();

const REQUIRED_ENV = [
  'INSFORGE_URL',
  'INSFORGE_KEY',
  'OPENAI_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_WEBHOOK_BASE',
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.warn(`Warning: Missing env var: ${key} — some features may not work`);
  }
}

const { app, server } = require('./server');
const { startScheduler } = require('./scheduler');
const logger = require('./logger');

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Cadence server started');
  startScheduler();
});
