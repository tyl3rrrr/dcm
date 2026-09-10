// config.js
// Zentrale Konfiguration des Bots - bewusst als EINZELNE Datei im Hauptordner,
// kein Unterordner. Werte kommen aus der .env; wer sie ändern will, kann sie
// entweder in der .env anpassen oder direkt hier unten als Fallback ändern.
//
// /reload ruft reloadAll() auf, um .env neu einzulesen, ohne den Bot neu
// zu starten.

const dotenv = require('dotenv');
dotenv.config();

const links = {
  website: process.env.WEBSITE_URL || 'https://tylxrrrr.is-great.net',
  antimdm: process.env.ANTIMDM_LINK || 'https://tinyurl.com/vr27mahv',
  discordInvite: process.env.DISCORD_INVITE || '',
  github: process.env.GITHUB_URL || '',
};

// Changelog-Einträge - bei neuen Updates einfach oben oder unten ergänzen.
const changelog = [
  {
    date: '2026-09-09',
    text: 'Bot erstellt: Status-Anzeige, /antimdm, /web und /uptime hinzugefügt.',
  },
  {
    date: '2026-09-09',
    text: 'Neue Befehle: /status, /changelog, /links, /reload, /botinfo und /automod-setup hinzugefügt.',
  },
  {
    date: '2026-09-10',
    text: 'Struktur vereinfacht: keine Unterordner mehr - alles in einzelnen Dateien (commands.js, config.js).',
  },
];

function reloadEnv() {
  // override: true, damit auch geänderte Werte aus der .env übernommen werden
  return dotenv.config({ override: true });
}

function reloadLinks() {
  links.website = process.env.WEBSITE_URL || links.website;
  links.antimdm = process.env.ANTIMDM_LINK || links.antimdm;
  links.discordInvite = process.env.DISCORD_INVITE || links.discordInvite;
  links.github = process.env.GITHUB_URL || links.github;
}

function reloadAll() {
  reloadEnv();
  reloadLinks();
}

module.exports = {
  links,
  changelog,
  reloadEnv,
  reloadLinks,
  reloadAll,
};
