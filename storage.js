// storage.js
// Einfache JSON-Datei-Persistenz - EINE Datei (data.json) im Hauptordner,
// kein Unterordner, keine Datenbank nötig.
//
// data.json wird beim ersten Start automatisch angelegt und ist bewusst
// in .gitignore aufgeführt: das sind Laufzeitdaten deines Servers
// (Ticket-Zähler, Warnungen, Kanal-IDs) und sollen nicht ins Git-Repo,
// damit `git push` nie wegen dieser Datei Probleme macht.

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

function defaultData() {
  return {
    guilds: {}, // guildId -> { ticketCategoryId, ticketStaffRoleId, logChannelId, ticketCounter }
    warns: {}, // guildId -> { userId -> [ { reason, date, moderatorId } ] }
  };
}

function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    // Fehlende Top-Level-Keys ergänzen (z.B. nach einem Update)
    return { ...defaultData(), ...parsed };
  } catch (err) {
    // Datei existiert noch nicht oder ist kaputt -> mit Standardwerten neu anlegen
    const fresh = defaultData();
    saveData(fresh);
    return fresh;
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Konnte data.json nicht speichern:', err.message);
  }
}

let data = loadData();

function reload() {
  data = loadData();
}

function getGuildSettings(guildId) {
  return data.guilds[guildId] || {};
}

function setGuildSetting(guildId, key, value) {
  if (!data.guilds[guildId]) data.guilds[guildId] = {};
  data.guilds[guildId][key] = value;
  saveData(data);
  return data.guilds[guildId];
}

function nextTicketNumber(guildId) {
  if (!data.guilds[guildId]) data.guilds[guildId] = {};
  const current = data.guilds[guildId].ticketCounter || 0;
  const next = current + 1;
  data.guilds[guildId].ticketCounter = next;
  saveData(data);
  return next;
}

function addWarn(guildId, userId, warnEntry) {
  if (!data.warns[guildId]) data.warns[guildId] = {};
  if (!data.warns[guildId][userId]) data.warns[guildId][userId] = [];
  data.warns[guildId][userId].push(warnEntry);
  saveData(data);
  return data.warns[guildId][userId];
}

function getWarns(guildId, userId) {
  return (data.warns[guildId] && data.warns[guildId][userId]) || [];
}

function clearWarns(guildId, userId) {
  if (data.warns[guildId]) {
    delete data.warns[guildId][userId];
    saveData(data);
  }
  return [];
}

module.exports = {
  getGuildSettings,
  setGuildSetting,
  nextTicketNumber,
  addWarn,
  getWarns,
  clearWarns,
  reload,
};
