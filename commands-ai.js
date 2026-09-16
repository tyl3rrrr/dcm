// commands-ai.js
const OpenAI = require('openai');
const config = require('./config');

let client = null;
function getOpenAI() {
  if (!process.env.OPENAI_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_KEY });
  return client;
}

const recent = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_USER = 5;

async function handleMention(message, botUser) {
  if (!message.content || !message.mentions.has(botUser)) return false;
  const api = getOpenAI();
  if (!api) {
    await message.reply('⚠️ Die KI-Funktion ist derzeit nicht konfiguriert.').catch(() => {});
    return true;
  }
  const key = `${message.guild?.id || 'dm'}:${message.author.id}`;
  const now = Date.now();
  const arr = (recent.get(key) || []).filter(t => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_USER) {
    await message.reply('⏳ Bitte warte kurz, bevor du die KI erneut ansprichst.').catch(() => {});
    return true;
  }
  arr.push(now); recent.set(key, arr);
  const prompt = message.content.replace(new RegExp(`<@!?${botUser.id}>`, 'g'), '').trim();
  if (!prompt) {
    await message.reply('👋 Erwähne mich zusammen mit deiner Frage, z. B. `@Bot test`.').catch(() => {});
    return true;
  }
  try {
    await message.channel.sendTyping().catch(() => {});
    const response = await api.responses.create({
      model: config.openai.model,
      input: [
        { role: 'system', content: 'Du bist ein hilfreicher Discord-Bot. Antworte kurz, freundlich und ohne geheime Konfigurationsdaten preiszugeben.' },
        { role: 'user', content: prompt }
      ],
      max_output_tokens: 500,
    });
    const answer = (response.output_text || '').trim() || 'Ich konnte gerade keine Antwort erzeugen.';
    await message.reply(answer.slice(0, 1900));
  } catch (err) {
    const status = err?.status;
    console.error('OpenAI request failed:', status || err?.name || 'unknown');
    const msg = status === 429
      ? '⏳ Die KI ist gerade ausgelastet. Bitte versuche es später erneut.'
      : '⚠️ Die KI konnte gerade nicht antworten. Bitte versuche es später erneut.';
    await message.reply(msg).catch(() => {});
  }
  return true;
}

module.exports = { handleMention };
