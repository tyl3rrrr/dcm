// commands-presence.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('./storage');
const config = require('./config');
const { ACCESS, requireAccess } = require('./permissions');
const { applyPresence, restartProcess } = require('./runtime');

const STATUS_CHOICES = [
  { name: 'Online', value: 'online' },
  { name: 'Idle / AFK', value: 'idle' },
  { name: 'Nicht stören / DND', value: 'dnd' },
  { name: 'Offline / Invisible', value: 'invisible' },
];

const status = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Website-Status anzeigen oder Bot-Presence setzen')
    .setDMPermission(false)
    .addStringOption(o => o.setName('status').setDescription('Bot-Presence setzen').addChoices(...STATUS_CHOICES).setRequired(false))
    .addStringOption(o => o.setName('twitch').setDescription('Twitch-Name für Streaming (Standard: 0tylxrrrr)').setRequired(false))
    .addBooleanOption(o => o.setName('streaming').setDescription('Streaming-Aktivität aktivieren').setRequired(false)),
  async execute(interaction) {
    const selected = interaction.options.getString('status');
    const twitch = interaction.options.getString('twitch');
    const streaming = interaction.options.getBoolean('streaming');
    if (!selected && twitch === null && streaming === null) {
      const res = await fetch(config.links.website, { signal: AbortSignal.timeout(6000) }).catch(err => null);
      await interaction.reply(`🌐 Website: ${res?.ok ? '🟢 erreichbar' : '🔴 nicht erreichbar'} — ${config.links.website}`);
      return;
    }
    if (!await requireAccess(interaction, ACCESS.MOD)) return;
    const s = selected || 'online';
    const stream = twitch || config.presence.twitchName;
    const useStreaming = streaming !== false;
    storage.setGuildSetting(interaction.guild.id, 'presenceSettings', { status: s, streaming: useStreaming, twitchName: stream });
    applyPresence(interaction.client, {
      status: s,
      type: useStreaming ? 'streaming' : 'playing',
      name: useStreaming ? stream : config.presence.activityName,
      url: config.presence.streamUrl.replace(/\/[^/]+$/, `/${encodeURIComponent(stream)}`),
    });
    await interaction.reply({ content: `✅ Presence gesetzt: **${s}**${useStreaming ? ` · Twitch: **${stream}**` : ''}\nHinweis: Discord-Presence ist bot-/Session-weit und nicht unabhängig pro Server. Die Einstellung wird zusätzlich pro Server gespeichert.`, ephemeral: true });
  },
};

const bStatNow = {
  data: new SlashCommandBuilder()
    .setName('bstatnow')
    .setDescription('Konfiguriert die globale Bot-Presence (Superuser)')
    .addStringOption(o => o.setName('status').setDescription('Presence-Status').addChoices(...STATUS_CHOICES).setRequired(false))
    .addStringOption(o => o.setName('twitch').setDescription('Twitch-Name').setRequired(false))
    .addBooleanOption(o => o.setName('streaming').setDescription('Streaming aktivieren').setRequired(false)),
  async execute(interaction) {
    if (interaction.user.id !== config.superuserId) {
      await interaction.reply({ content: '❌ Nur der konfigurierte Superuser darf diesen Command verwenden.', ephemeral: true }); return;
    }
    const statusValue = interaction.options.getString('status') || config.presence.defaultStatus;
    const twitch = interaction.options.getString('twitch') || config.presence.twitchName;
    const streaming = interaction.options.getBoolean('streaming');
    const next = { status: statusValue, streaming: streaming !== false, twitchName: twitch };
    config.presence.defaultStatus = statusValue;
    config.presence.twitchName = twitch;
    storage.setGuildSetting('_global', 'presenceSettings', next);
    applyPresence(interaction.client, {
      status: statusValue,
      type: next.streaming ? 'streaming' : 'playing',
      name: next.streaming ? twitch : config.presence.activityName,
      url: config.presence.streamUrl.replace(/\/[^/]+$/, `/${encodeURIComponent(twitch)}`),
    });
    await interaction.reply({ content: `✅ Globale Presence gesetzt: **${statusValue}**${next.streaming ? ` · Twitch: **${twitch}**` : ''}`, ephemeral: true });
  },
};

const admReload = {
  data: new SlashCommandBuilder().setName('adm-reload').setDescription('Startet den Bot-Prozess vollständig neu').setDMPermission(false),
  async execute(interaction) {
    if (!await requireAccess(interaction, ACCESS.ADMIN)) return;
    await interaction.reply({ content: '♻️ Bot wird vollständig neu gestartet. Die Verbindung wird kurz getrennt.', ephemeral: true });
    try { await restartProcess(); } catch (err) {
      console.error('Prozess-Neustart fehlgeschlagen:', err.message);
    }
  },
};

module.exports = { status, bStatNow, admReload };
