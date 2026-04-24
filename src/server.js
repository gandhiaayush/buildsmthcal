require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const {
  handleIncomingCall,
  handleConsent,
  handleJoin,
  handleConferenceStatus,
  handleChatterStream,
} = require('./conference');
const logger = require('./logger');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Validate Twilio signatures in production
const validateTwilio = process.env.NODE_ENV === 'production'
  ? twilio.webhook({ validate: true })
  : (req, res, next) => next();

// Caller dials the Chatter number
app.post('/voice', validateTwilio, handleIncomingCall);

// IVR digit collection for consent
app.post('/consent', validateTwilio, handleConsent);

// Join the conference after consent decision
app.post('/join', validateTwilio, handleJoin);

// Conference participant join/leave events
app.post('/conference/status', validateTwilio, handleConferenceStatus);

// TwiML for Chatter's bot call leg (returns Media Streams TwiML)
app.post('/chatter/stream', validateTwilio, handleChatterStream);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

module.exports = app;
