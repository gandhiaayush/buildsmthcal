require('dotenv').config();
const twilio = require('twilio');
const WebSocket = require('ws');
const StreamingSTT = require('./stt');
const ConsentManager = require('./consent');
const Transcript = require('./transcript');
const { respond } = require('./llm');
const { synthesize } = require('./tts');
const logger = require('./logger');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const VoiceResponse = twilio.twiml.VoiceResponse;

// In-memory state per conference. In production, this would be Redis.
const conferences = new Map(); // conferenceSid → { stt, transcript, consent, mediaWs }

/**
 * Twilio webhook: POST /voice
 * Called when any party dials the Chatter number.
 * Puts them in a named conference and plays consent IVR.
 */
function handleIncomingCall(req, res) {
  const callSid = req.body.CallSid;
  const conferenceName = 'chatter-main'; // single conference for MVP

  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    numDigits: 1,
    action: `/consent?callSid=${callSid}&conference=${conferenceName}`,
    timeout: 10,
  });
  gather.say(
    { voice: 'Polly.Joanna' },
    'This call includes Chatter, an AI assistant. Both parties will hear it. Press 1 to continue, or stay silent to proceed without Chatter.'
  );

  // If no digit pressed in 10s, put them in conference without triggering consent
  twiml.redirect(`/join?callSid=${callSid}&conference=${conferenceName}&consented=false`);

  logger.info({ callSid, conferenceName }, 'incoming call');
  res.type('text/xml').send(twiml.toString());
}

/**
 * Twilio webhook: POST /consent
 * Receives digit press from IVR.
 */
function handleConsent(req, res) {
  const { callSid, conference } = req.query;
  const digit = req.body.Digits;
  const consented = digit === '1';

  logger.info({ callSid, digit, consented }, 'consent digit received');

  const twiml = new VoiceResponse();
  if (consented) {
    twiml.say({ voice: 'Polly.Joanna' }, 'Thank you.');
  }
  twiml.redirect(`/join?callSid=${callSid}&conference=${conference}&consented=${consented}`);
  res.type('text/xml').send(twiml.toString());
}

/**
 * Twilio webhook: POST /join
 * Joins the caller to the conference.
 */
function handleJoin(req, res) {
  const { callSid, conference, consented } = req.query;
  const twiml = new VoiceResponse();
  const dial = twiml.dial();

  dial.conference(conference, {
    startConferenceOnEnter: true,
    endConferenceOnExit: false,
    statusCallback: `/conference/status?conference=${conference}`,
    statusCallbackEvent: 'join leave',
    statusCallbackMethod: 'POST',
  });

  // Store consent decision — ConsentManager picks it up via status callback
  if (!conferences.has(conference)) {
    conferences.set(conference, createConferenceState(conference));
  }
  const state = conferences.get(conference);
  state.pendingConsents.set(callSid, consented === 'true');

  logger.info({ callSid, conference, consented }, 'joining conference');
  res.type('text/xml').send(twiml.toString());
}

/**
 * Twilio webhook: POST /conference/status
 * Called when a participant joins or leaves.
 */
async function handleConferenceStatus(req, res) {
  const { conference } = req.query;
  const { CallSid, StatusCallbackEvent, ConferenceSid } = req.body;

  if (!conferences.has(conference)) {
    conferences.set(conference, createConferenceState(conference));
  }
  const state = conferences.get(conference);

  if (StatusCallbackEvent === 'participant-join') {
    state.consent.participantJoined(CallSid);

    // Apply pending consent decision
    const didConsent = state.pendingConsents.get(CallSid);
    if (didConsent) {
      state.consent.consent(CallSid);
    } else {
      // Non-consenting party: start timer on first join
      if (!state.timerStarted) {
        state.timerStarted = true;
        state.consent.startTimer();
      }
    }

    // If we have 2+ participants and haven't started Chatter yet, check
    if (state.participants.size === 0) {
      state.consent.startTimer();
      state.timerStarted = true;
    }
    state.participants.add(CallSid);

    logger.info({ CallSid, ConferenceSid, participants: state.participants.size }, 'participant joined');
  }

  if (StatusCallbackEvent === 'participant-leave') {
    state.participants.delete(CallSid);
    logger.info({ CallSid, participants: state.participants.size }, 'participant left');

    if (state.participants.size === 0) {
      await teardownConference(conference);
    }
  }

  res.sendStatus(200);
}

function createConferenceState(conferenceName) {
  const transcript = new Transcript();

  const consent = new ConsentManager(
    conferenceName,
    () => {
      // Both parties consented — spin up Chatter's bot leg
      logger.info({ conference: conferenceName }, 'consent granted, starting chatter');
      startChatterLeg(conferenceName);
    },
    (reason) => {
      logger.info({ conference: conferenceName, reason }, 'chatter departing');
      announceAndLeave(conferenceName, 'Understood. Chatter is disconnecting. Have a great call.');
    }
  );

  return {
    transcript,
    consent,
    participants: new Set(),
    pendingConsents: new Map(),
    timerStarted: false,
    stt: null,
    mediaWs: null,
    chatterCallSid: null,
  };
}

/**
 * Create Chatter's bot call leg in the conference via REST API.
 * Chatter's call TwiML starts a Media Stream for audio I/O.
 */
async function startChatterLeg(conferenceName) {
  const webhookBase = process.env.BASE_URL;
  try {
    const call = await client.calls.create({
      url: `${webhookBase}/chatter/stream?conference=${conferenceName}`,
      to: `client:chatter-bot`, // Twilio Client identity — use a SIP endpoint or conference number trick
      from: process.env.TWILIO_PHONE_NUMBER,
      // Alternative: use a Twilio SIP trunk or conference participant API
    });
    const state = conferences.get(conferenceName);
    if (state) state.chatterCallSid = call.sid;
    logger.info({ callSid: call.sid, conference: conferenceName }, 'chatter leg created');
  } catch (err) {
    logger.error({ err: err.message, conference: conferenceName }, 'failed to create chatter leg');
  }
}

/**
 * TwiML for Chatter's bot call leg.
 * Opens a bidirectional Media Stream for STT input and TTS output.
 */
function handleChatterStream(req, res) {
  const { conference } = req.query;
  const webhookBase = process.env.BASE_URL;
  const wsUrl = webhookBase.replace(/^http/, 'ws') + `/media-stream?conference=${conference}`;

  const twiml = new VoiceResponse();
  const connect = twiml.connect();
  connect.stream({
    url: wsUrl,
    track: 'both_tracks', // send and receive audio
  });

  res.type('text/xml').send(twiml.toString());
}

/**
 * Handles the Twilio Media Streams WebSocket connection for Chatter's leg.
 * wss://yourserver/media-stream?conference=xxx
 *
 * Attach this to an HTTP upgrade event in server.js.
 */
function setupMediaStreamServer(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== '/media-stream') return;

    const conference = url.searchParams.get('conference');
    wss.handleUpgrade(req, socket, head, (ws) => {
      handleMediaStreamWs(ws, conference);
    });
  });
}

function handleMediaStreamWs(ws, conferenceName) {
  logger.info({ conference: conferenceName }, 'media stream websocket connected');

  const state = conferences.get(conferenceName);
  if (!state) {
    logger.error({ conference: conferenceName }, 'no state for conference on media stream connect');
    ws.close();
    return;
  }

  state.mediaWs = ws;

  const stt = new StreamingSTT(state.transcript, async (query) => {
    if (!state.consent.isActive()) return;
    await handleWakeWord(conferenceName, query, ws);
  });
  state.stt = stt;
  stt.start();

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    switch (msg.event) {
      case 'start':
        logger.info({ streamSid: msg.streamSid, conference: conferenceName }, 'media stream started');
        state.streamSid = msg.streamSid;
        break;
      case 'media':
        stt.sendFrame(msg.media.payload);
        break;
      case 'stop':
        logger.info({ conference: conferenceName }, 'media stream stopped');
        stt.stop();
        break;
    }
  });

  ws.on('close', () => {
    logger.info({ conference: conferenceName }, 'media stream websocket closed');
    stt.stop();
  });
}

async function handleWakeWord(conferenceName, query, ws) {
  const state = conferences.get(conferenceName);
  if (!state) return;

  const effectiveQuery = query || 'Can you give us a brief status update based on our conversation?';
  logger.info({ conference: conferenceName, query: effectiveQuery }, 'wake word triggered');

  // Mute Deepgram so Chatter's response doesn't trigger itself (ADR-005)
  state.stt.mute();

  try {
    // Get response from Claude (with web search if needed)
    const answer = await respond(effectiveQuery, state.transcript);

    // Add Chatter's response to transcript
    state.transcript.add('Chatter', answer);

    // Synthesize and stream audio frames back to Twilio
    const frames = await synthesize(answer);
    injectAudio(ws, state.streamSid, frames);
  } catch (err) {
    logger.error({ err: err.message }, 'wake word handling failed');
    const fallbackFrames = await synthesize("Sorry, I couldn't get that. Try again.");
    injectAudio(ws, state.streamSid, fallbackFrames);
  } finally {
    // Wait for audio playback to finish (approx), then unmute
    // Rough estimate: 8kHz mulaw, 160 bytes/frame = 20ms/frame
    // Better: track actual frame count and wait
    setTimeout(() => state.stt?.unmute(), 500);
  }
}

/**
 * Send audio frames via Twilio Media Streams WebSocket.
 * Each frame is a 160-byte base64-encoded mulaw 8kHz chunk (20ms).
 */
function injectAudio(ws, streamSid, frames) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    logger.error('media stream ws not open for audio injection');
    return;
  }
  for (const frame of frames) {
    ws.send(JSON.stringify({
      event: 'media',
      streamSid,
      media: { payload: frame.toString('base64') },
    }));
  }
  logger.debug({ frames: frames.length }, 'audio frames injected');
}

async function announceAndLeave(conferenceName, message) {
  const state = conferences.get(conferenceName);
  if (!state?.mediaWs || !state.streamSid) return;
  try {
    const frames = await synthesize(message);
    injectAudio(state.mediaWs, state.streamSid, frames);
    // Give audio time to play, then hang up Chatter's leg
    setTimeout(async () => {
      if (state.chatterCallSid) {
        await client.calls(state.chatterCallSid).update({ status: 'completed' });
      }
    }, (frames.length * 20) + 500);
  } catch (err) {
    logger.error({ err: err.message }, 'announceAndLeave failed');
  }
}

async function teardownConference(conferenceName) {
  const state = conferences.get(conferenceName);
  if (!state) return;
  state.stt?.stop();
  state.mediaWs?.close();
  conferences.delete(conferenceName);
  logger.info({ conference: conferenceName }, 'conference torn down');
}

module.exports = {
  handleIncomingCall,
  handleConsent,
  handleJoin,
  handleConferenceStatus,
  handleChatterStream,
  setupMediaStreamServer,
};
