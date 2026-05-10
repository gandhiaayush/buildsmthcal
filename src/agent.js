'use strict';

require('dotenv').config();
const WebSocket = require('ws');
const logger = require('./logger');
const { buildAppointmentReminderPrompt } = require('./agent-configs');

class OpenAIRealtimeAgent {
  constructor({ taskId, dynamicVariables = {}, onAudioOut, onTranscript }) {
    this.taskId = taskId;
    this.dynamicVariables = dynamicVariables;
    this.onAudioOut = onAudioOut;     // (base64g711ulawString) → void — send audio to Twilio
    this.onTranscript = onTranscript; // ({ role: 'agent'|'user', text }) → void
    this.ws = null;
    this.transcript = [];
  }

  connect() {
    this.ws = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      }
    );

    this.ws.on('open', () => {
      logger.info({ taskId: this.taskId }, 'openai realtime: connected');
      this._configure();
    });

    this.ws.on('message', (data) => {
      try {
        this._handleMessage(JSON.parse(data.toString()));
      } catch (err) {
        logger.warn({ taskId: this.taskId, err: err.message }, 'openai realtime: bad message');
      }
    });

    this.ws.on('error', (err) => {
      logger.error({ taskId: this.taskId, err: err.message }, 'openai realtime: ws error');
    });

    this.ws.on('close', (code) => {
      logger.info({ taskId: this.taskId, code }, 'openai realtime: ws closed');
    });
  }

  _configure() {
    // Substitute {{variable}} placeholders in prompt
    let instructions = buildAppointmentReminderPrompt();
    for (const [k, v] of Object.entries(this.dynamicVariables)) {
      instructions = instructions.replaceAll(`{{${k}}}`, v ?? '');
    }

    this.ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions,
        voice: 'alloy',
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
        },
      },
    }));

    logger.info({ taskId: this.taskId }, 'openai realtime: session configured');
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case 'response.audio.delta':
        if (msg.delta) this.onAudioOut?.(msg.delta);
        break;

      case 'response.audio_transcript.done':
        if (msg.transcript) {
          this.transcript.push(`Agent: ${msg.transcript}`);
          this.onTranscript?.({ role: 'agent', text: msg.transcript });
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (msg.transcript) {
          this.transcript.push(`Patient: ${msg.transcript}`);
          this.onTranscript?.({ role: 'user', text: msg.transcript });
        }
        break;

      case 'session.created':
        logger.info({ taskId: this.taskId, session_id: msg.session?.id }, 'openai realtime: session created');
        break;

      case 'session.updated':
        logger.info({ taskId: this.taskId }, 'openai realtime: session ready');
        break;

      case 'error':
        logger.error({ taskId: this.taskId, code: msg.error?.code, message: msg.error?.message }, 'openai realtime: error event');
        break;
    }
  }

  sendAudio(base64Audio) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64Audio }));
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  getTranscript() {
    return this.transcript.join('\n');
  }
}

module.exports = OpenAIRealtimeAgent;
