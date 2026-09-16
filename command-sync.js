// command-sync.js
// Zentrale Slash-Command-Synchronisation.
//
// WICHTIG: Discord-Global-Commands können verzögert verteilt werden. Deshalb
// werden die Commands standardmäßig zusätzlich als Guild-Commands auf ALLEN
// Servern registriert, auf denen der Bot gerade ist. Damit sind neue Commands
// nach einem Neustart praktisch sofort verfügbar.

const { REST, Routes } = require('discord.js');
const commandList = require('./commands');

function commandJson() {
  const seen = new Set();
  const commands = [];

  for (const command of commandList) {
    if (!command?.data || typeof command.execute !== 'function') continue;
    const json = command.data.toJSON();
    if (!json?.name || seen.has(json.name)) continue;
    seen.add(json.name);
    commands.push(json);
  }

  return commands;
}

function getSyncMode() {
  const mode = String(process.env.COMMAND_SYNC_MODE || 'all').trim().toLowerCase();
  return ['all', 'global', 'single'].includes(mode) ? mode : 'all';
}

async function syncCommands(client = null) {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  if (!token || !clientId) throw new Error('DISCORD_TOKEN oder CLIENT_ID fehlt.');

  const rest = new REST({ version: '10' }).setToken(token);
  const body = commandJson();
  const mode = getSyncMode();
  const result = { count: body.length, names: body.map(x => x.name), scope: mode, guilds: [] };

  // Global PUT entfernt automatisch alte globale Commands, die nicht mehr im
  // aktuellen Command-Set enthalten sind. Die Verteilung durch Discord kann
  // trotzdem einige Zeit dauern.
  if (mode === 'global' || mode === 'all') {
    const globalData = await rest.put(Routes.applicationCommands(clientId), { body });
    result.global = { count: globalData.length };
  }

  if (mode === 'single') {
    const guildId = String(process.env.GUILD_ID || '').trim();
    if (!/^\d{17,20}$/.test(guildId)) {
      throw new Error('COMMAND_SYNC_MODE=single benötigt eine gültige GUILD_ID.');
    }
    const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    result.scope = `Guild ${guildId}`;
    result.guilds.push({ guildId, count: data.length });
    return result;
  }

  // Im Standardmodus: jeden aktuell verbundenen Server synchronisieren.
  // Guild-Commands werden von Discord unmittelbar für diese Guild bereitgestellt.
  if (client?.guilds?.cache) {
    for (const guild of client.guilds.cache.values()) {
      try {
        const data = await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body });
        result.guilds.push({ guildId: guild.id, guildName: guild.name, count: data.length });
      } catch (err) {
        result.guilds.push({ guildId: guild.id, guildName: guild.name, count: 0, error: err.message });
        console.error(`❌ Command-Sync für Guild ${guild.id} (${guild.name}) fehlgeschlagen:`, err.message);
      }
    }
  }

  result.scope = mode === 'all' ? 'Global + alle verbundenen Guilds' : 'Global';
  return result;
}

module.exports = { syncCommands, commandJson, getSyncMode };
