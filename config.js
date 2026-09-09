// lib/config.js
// Lädt .env, config/links.json und config/changelog.json.
// Stellt reload-Funktionen bereit, damit /reload die Konfiguration
// neu einlesen kann, ohne den Bot-Prozess neu zu starten.

const fs = require('fs');
const path = require('path');

const dotenv = require('dotenv');
dotenv.config();

const LINKS_PATH = path.join(__dirname, '..', 'config', 'links.json');
const CHANGELOG_PATH = path.join(__dirname, '..', 'config', 'changelog.json');

let links = {};
let changelog = [];

function safeReadJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Konnte ${filePath} nicht laden/parsen:`, err.message);
    return fallback;
  }
}

function loadLinks() {
  links = safeReadJson(LINKS_PATH, {});
  return links;
}

function loadChangelog() {
  const data = safeReadJson(CHANGELOG_PATH, []);
  changelog = Array.isArray(data) ? data : [];
  return changelog;
}

function reloadEnv() {
  // override: true, damit auch geänderte Werte in der .env übernommen werden
  return dotenv.config({ override: true });
}

function reloadAll() {
  reloadEnv();
  loadLinks();
  loadChangelog();
}

// Beim ersten Laden des Moduls direkt einlesen
loadLinks();
loadChangelog();

module.exports = {
  get links() {
    return links;
  },
  get changelog() {
    return changelog;
  },
  loadLinks,
  loadChangelog,
  reloadEnv,
  reloadAll,
};
