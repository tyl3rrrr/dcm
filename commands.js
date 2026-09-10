// commands.js
// Sammelt ALLE Slash-Commands in einem Array. index.js und deploy-commands.js
// importieren nur diese eine Datei - kein Ordner-Scan.

const core = require('./commands-core');
const { automodSetup } = require('./commands-automod');
const mod = require('./commands-mod');
const { settings } = require('./commands-settings');
const { ticketPanel } = require('./commands-tickets');

const withoutHelp = [
  ...core.simpleCommands,
  automodSetup,
  mod.kick,
  mod.ban,
  mod.timeout,
  mod.warn,
  mod.clear,
  settings,
  ticketPanel,
];

// /help braucht die vollständige Liste (inkl. sich selbst) für die Anzeige,
// daher wird es erst hier zusammengesetzt, um einen Zirkelbezug zu vermeiden.
const help = core.buildHelpCommand(() => allCommands);

const allCommands = [...withoutHelp, help];

module.exports = allCommands;
