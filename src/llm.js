require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const logger = require('./logger');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Chatter, an AI assistant participating in a live phone call between two people.
You can hear the full conversation and respond when invoked.
Be concise — spoken answers, 2-3 sentences max unless more depth is clearly needed.
You have access to web search for real-time facts. Use it when the question requires current information.
Never reveal the transcript back verbatim. Synthesize and answer directly.`;

const tools = [
  {
    name: 'web_search',
    description: 'Search the web for current information. Use when the question requires recent facts, prices, news, or data not knowable from conversation context alone.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
];

async function webSearch(query) {
  const start = Date.now();
  try {
    const response = await axios.get('https://api.exa.ai/search', {
      headers: { 'x-api-key': process.env.EXA_API_KEY, 'Content-Type': 'application/json' },
      params: { query, num_results: 3, type: 'neural', use_autoprompt: true },
    });
    const results = response.data.results || [];
    const text = results.map(r => `${r.title}: ${r.text?.slice(0, 300)}`).join('\n\n');
    logger.info({ latency_ms: Date.now() - start, results: results.length }, 'web search complete');
    return text || 'No results found.';
  } catch (err) {
    logger.error({ err: err.message }, 'web search failed');
    return 'Search unavailable.';
  }
}

/**
 * Given a user query and the rolling transcript, get a spoken response from Claude.
 * Handles web search tool use automatically.
 * Returns the text response string.
 */
async function respond(query, transcript) {
  const start = Date.now();
  const messages = [
    {
      role: 'user',
      content: `Transcript so far:\n${transcript.toPromptString()}\n\nQuestion: ${query}`,
    },
  ];

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  // Agentic loop: handle tool use (web search).
  while (response.stop_reason === 'tool_use') {
    const toolUseBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolUseBlock || toolUseBlock.name !== 'web_search') break;

    logger.info({ query: toolUseBlock.input.query }, 'claude requesting web search');
    const searchResult = await webSearch(toolUseBlock.input.query);

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: searchResult }],
    });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
  }

  const textBlock = response.content.find(b => b.type === 'text');
  const answer = textBlock?.text || "Sorry, I couldn't get that.";

  logger.info({
    latency_ms: Date.now() - start,
    input_tokens: response.usage?.input_tokens,
    output_tokens: response.usage?.output_tokens,
    tool_used: response.content.some(b => b.type === 'tool_use'),
  }, 'claude respond complete');

  return answer;
}

module.exports = { respond };
