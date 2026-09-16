// storage.js
// JSON-Persistenz mit servergetrennter Struktur. data.json bleibt bewusst
// außerhalb des Git-Repos. Schreibzugriffe sind innerhalb des Node-Prozesses
// synchron und damit atomar bezüglich anderer Event-Handler dieses Prozesses.

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

function defaultData() {
  return {
    guilds: {},
    warns: {},
    spotify: {},
    xp: {}, // guildId -> userId -> { xp, level, messages }
    globalXp: {}, // userId -> { xp, messages } (aggregierte Server-XP)
  };
}

function loadData() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      ...defaultData(),
      ...parsed,
      guilds: parsed.guilds || {},
      warns: parsed.warns || {},
      spotify: parsed.spotify || {},
      xp: parsed.xp || {},
      globalXp: parsed.globalXp || {},
    };
  } catch {
    const fresh = defaultData();
    saveData(fresh);
    return fresh;
  }
}

function saveData(nextData) {
  try {
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(nextData, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error('Konnte data.json nicht speichern:', err.message);
  }
}

let data = loadData();

function reload() { data = loadData(); }

function getGuildSettings(guildId) { return data.guilds[guildId] || {}; }

function setGuildSetting(guildId, key, value) {
  if (!data.guilds[guildId]) data.guilds[guildId] = {};
  data.guilds[guildId][key] = value;
  saveData(data);
  return data.guilds[guildId];
}

function updateGuildSettings(guildId, patch) {
  if (!data.guilds[guildId]) data.guilds[guildId] = {};
  Object.assign(data.guilds[guildId], patch);
  saveData(data);
  return data.guilds[guildId];
}

function nextTicketNumber(guildId) {
  if (!data.guilds[guildId]) data.guilds[guildId] = {};
  const next = (data.guilds[guildId].ticketCounter || 0) + 1;
  data.guilds[guildId].ticketCounter = next;
  saveData(data);
  return next;
}

function nextWelcomeMemberNumber(guildId, initialCounter = 0) {
  if (!data.guilds[guildId]) data.guilds[guildId] = {};
  if (!data.guilds[guildId].welcomeMemberCounter && initialCounter > 0) data.guilds[guildId].welcomeMemberCounter = initialCounter;
  const next = (data.guilds[guildId].welcomeMemberCounter || 0) + 1;
  data.guilds[guildId].welcomeMemberCounter = next;
  saveData(data);
  return next;
}

const MAX_WARNS_PER_USER = 100;
function addWarn(guildId, userId, warnEntry) {
  if (!data.warns[guildId]) data.warns[guildId] = {};
  if (!data.warns[guildId][userId]) data.warns[guildId][userId] = [];
  data.warns[guildId][userId].push(warnEntry);
  data.warns[guildId][userId] = data.warns[guildId][userId].slice(-MAX_WARNS_PER_USER);
  saveData(data);
  return data.warns[guildId][userId];
}
function getWarns(guildId, userId) { return (data.warns[guildId] && data.warns[guildId][userId]) || []; }
function clearWarns(guildId, userId) {
  if (data.warns[guildId]) { delete data.warns[guildId][userId]; saveData(data); }
  return [];
}

function getSpotifyTokens(discordUserId) { return (data.spotify && data.spotify[discordUserId]) || null; }
function setSpotifyTokens(discordUserId, tokens) {
  if (!data.spotify) data.spotify = {};
  data.spotify[discordUserId] = tokens;
  saveData(data);
}

function ensureXp(guildId, userId) {
  if (!data.xp[guildId]) data.xp[guildId] = {};
  if (!data.xp[guildId][userId]) data.xp[guildId][userId] = { xp: 0, level: 0, messages: 0 };
  return data.xp[guildId][userId];
}
function getXp(guildId, userId) { return { ...ensureXp(guildId, userId) }; }
function setXp(guildId, userId, patch) {
  const row = ensureXp(guildId, userId);
  Object.assign(row, patch);
  data.xp[guildId][userId] = row;
  saveData(data);
  return { ...row };
}
function addXp(guildId, userId, amount, level) {
  const row = ensureXp(guildId, userId);
  row.xp += Math.max(0, Number(amount) || 0);
  row.level = Math.max(0, Number(level) || 0);
  row.messages += 1;
  data.xp[guildId][userId] = row;
  if (!data.globalXp[userId]) data.globalXp[userId] = { xp: 0, messages: 0 };
  data.globalXp[userId].xp += Math.max(0, Number(amount) || 0);
  data.globalXp[userId].messages += 1;
  saveData(data);
  return { ...row };
}
function getGuildXpLeaderboard(guildId) {
  return Object.entries(data.xp[guildId] || {})
    .map(([userId, row]) => ({ userId, ...row }))
    .sort((a, b) => b.xp - a.xp || a.userId.localeCompare(b.userId));
}
function getGlobalXpLeaderboard() {
  return Object.entries(data.globalXp || {})
    .map(([userId, row]) => ({ userId, ...row }))
    .sort((a, b) => b.xp - a.xp || a.userId.localeCompare(b.userId));
}
function getUserGuildXp(userId) {
  const rows=[];
  for(const [guildId,users] of Object.entries(data.xp||{})) if(users[userId]) rows.push({guildId,userId,...users[userId]});
  return rows.sort((a,b)=>b.xp-a.xp);
}
function getGlobalXpRank(userId) {
  const board = getGlobalXpLeaderboard();
  const index = board.findIndex((x) => x.userId === userId);
  return index === -1 ? null : index + 1;
}

module.exports = {
  getGuildSettings, setGuildSetting, updateGuildSettings, nextTicketNumber,
  nextWelcomeMemberNumber, addWarn, getWarns, clearWarns,
  getSpotifyTokens, setSpotifyTokens, reload,
  getXp, setXp, addXp, getGuildXpLeaderboard, getGlobalXpLeaderboard, getGlobalXpRank, getUserGuildXp,
};
