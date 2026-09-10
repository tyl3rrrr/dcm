// commands.js
// Alle Slash-Commands des Bots in EINER Datei - bewusst kein commands/-Ordner,
// damit index.js und deploy-commands.js ohne Verzeichnis-Scan (fs.readdirSync)
// funktionieren. Neue Befehle werden hier unten als weiteres Objekt im
// exportierten Array ergänzt.

const os = require('os');
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  AutoModerationRuleTriggerType,
  AutoModerationRuleEventType,
  AutoModerationActionType,
  AutoModerationRuleKeywordPresetType,
  version: djsVersion,
} = require('discord.js');

const config = require('./config');
const pkg = require('./package.json');

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function formatUptime(ms) {
  let totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);
  totalSeconds -= days * 86400;

  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds -= hours * 3600;

  const minutes = Math.floor(totalSeconds / 60);
  totalSeconds -= minutes * 60;

  const seconds = totalSeconds;

  const parts = [];
  if (days > 0) parts.push(`${days} Tag${days === 1 ? '' : 'e'}`);
  if (hours > 0) parts.push(`${hours} Stunde${hours === 1 ? '' : 'n'}`);
  if (minutes > 0) parts.push(`${minutes} Minute${minutes === 1 ? '' : 'n'}`);
  parts.push(`${seconds} Sekunde${seconds === 1 ? '' : 'n'}`);

  return parts.join(', ');
}

function buildAutoModRuleDefinitions() {
  return [
    {
      name: '[AutoBot] Filter: Anstößige Inhalte',
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.KeywordPreset,
      triggerMetadata: {
        presets: [
          AutoModerationRuleKeywordPresetType.Profanity,
          AutoModerationRuleKeywordPresetType.SexualContent,
          AutoModerationRuleKeywordPresetType.Slurs,
        ],
      },
      actions: [{ type: AutoModerationActionType.BlockMessage }],
    },
    {
      name: '[AutoBot] Filter: Mention-Spam',
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.MentionSpam,
      triggerMetadata: { mentionTotalLimit: 6 },
      actions: [{ type: AutoModerationActionType.BlockMessage }],
    },
    {
      name: '[AutoBot] Filter: Spam-Erkennung',
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Spam,
      triggerMetadata: {},
      actions: [{ type: AutoModerationActionType.BlockMessage }],
    },
    {
      name: '[AutoBot] Filter: Fremde Einladungslinks',
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Keyword,
      triggerMetadata: {
        keywordFilter: ['discord.gg/*', '*discordapp.com/invite/*', '*discord.com/invite/*'],
      },
      actions: [{ type: AutoModerationActionType.BlockMessage }],
    },
  ];
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const antimdm = {
  data: new SlashCommandBuilder().setName('antimdm').setDescription('Sendet den AntiMDM-Link'),
  async execute(interaction) {
    await interaction.reply(config.links.antimdm);
  },
};

const web = {
  data: new SlashCommandBuilder().setName('web').setDescription('Zeigt den Link zur Website'),
  async execute(interaction) {
    await interaction.reply(`Link: ${config.links.website}`);
  },
};

const uptime = {
  data: new SlashCommandBuilder().setName('uptime').setDescription('Zeigt an, wie lange der Bot schon läuft'),
  async execute(interaction) {
    const readyAt = interaction.client.readyTimestamp || Date.now();
    const uptimeMs = Date.now() - readyAt;
    await interaction.reply(`⏱️ Uptime: ${formatUptime(uptimeMs)}`);
  },
};

const status = {
  data: new SlashCommandBuilder().setName('status').setDescription('Prüft, ob die Website erreichbar ist'),
  async execute(interaction) {
    await interaction.deferReply();

    const url = config.links.website;
    const TIMEOUT_MS = 6000;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const start = Date.now();

    try {
      const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
      const ms = Date.now() - start;

      const embed = new EmbedBuilder()
        .setTitle('🌐 Website-Status')
        .setColor(res.ok ? 0x57f287 : 0xfee75c)
        .addFields(
          { name: 'URL', value: url },
          {
            name: 'Erreichbarkeit',
            value: res.ok ? '🟢 Erreichbar' : `🟡 Antwort erhalten, aber HTTP-Status ${res.status}`,
          },
          { name: 'HTTP-Code', value: String(res.status), inline: true },
          { name: 'Antwortzeit', value: `${ms} ms`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const timedOut = err.name === 'AbortError';

      const embed = new EmbedBuilder()
        .setTitle('🌐 Website-Status')
        .setColor(0xed4245)
        .addFields(
          { name: 'URL', value: url },
          { name: 'Erreichbarkeit', value: '🔴 Nicht erreichbar' },
          {
            name: 'Fehler',
            value: timedOut ? `Zeitüberschreitung (> ${TIMEOUT_MS / 1000}s)` : err.message,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } finally {
      clearTimeout(timeoutHandle);
    }
  },
};

const changelog = {
  data: new SlashCommandBuilder().setName('changelog').setDescription('Zeigt die letzten Updates des Projekts'),
  async execute(interaction) {
    const entries = config.changelog;

    if (!entries || entries.length === 0) {
      await interaction.reply({
        content: 'Es sind noch keine Changelog-Einträge vorhanden.',
        ephemeral: true,
      });
      return;
    }

    const MAX_ENTRIES_SHOWN = 5;
    const latest = entries.slice(-MAX_ENTRIES_SHOWN).reverse();

    const embed = new EmbedBuilder()
      .setTitle('📋 Changelog')
      .setColor(0x5865f2)
      .setDescription(latest.map((e) => `**${e.date || '?'}** — ${e.text || '(kein Text)'}`).join('\n\n'))
      .setFooter({ text: `Letzte ${latest.length} von ${entries.length} Einträgen` });

    await interaction.reply({ embeds: [embed] });
  },
};

const links = {
  data: new SlashCommandBuilder().setName('links').setDescription('Zeigt wichtige Links zum Projekt'),
  async execute(interaction) {
    const l = config.links || {};
    const fields = [];

    if (l.website) fields.push({ name: '🌐 Website', value: l.website });
    if (l.discordInvite) fields.push({ name: '💬 Discord-Server', value: l.discordInvite });
    if (l.github) fields.push({ name: '🐙 GitHub', value: l.github });
    if (l.antimdm) fields.push({ name: '🛡️ AntiMDM', value: l.antimdm });

    if (fields.length === 0) {
      await interaction.reply({
        content: 'Es sind noch keine Links konfiguriert (config.js / .env).',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder().setTitle('🔗 Wichtige Links').setColor(0x5865f2).addFields(fields);
    await interaction.reply({ embeds: [embed] });
  },
};

const reload = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Lädt die .env neu, ohne den Bot neuzustarten')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const ownerId = process.env.OWNER_ID;

    if (ownerId && ownerId.trim() !== '' && interaction.user.id !== ownerId.trim()) {
      await interaction.reply({
        content: 'Nur der Bot-Owner darf die Konfiguration neu laden.',
        ephemeral: true,
      });
      return;
    }

    try {
      config.reloadAll();
      await interaction.reply({
        content: '✅ Konfiguration wurde neu geladen (.env).',
        ephemeral: true,
      });
    } catch (err) {
      console.error('Fehler beim Neuladen der Konfiguration:', err);
      await interaction.reply({
        content: '❌ Beim Neuladen der Konfiguration ist ein Fehler aufgetreten.',
        ephemeral: true,
      });
    }
  },
};

const botinfo = {
  data: new SlashCommandBuilder().setName('botinfo').setDescription('Zeigt technische Informationen über den Bot'),
  async execute(interaction) {
    const client = interaction.client;
    const mem = process.memoryUsage();
    const uptimeMs = Date.now() - (client.readyTimestamp || Date.now());

    const embed = new EmbedBuilder()
      .setTitle('🤖 Bot-Info')
      .setColor(0x5865f2)
      .addFields(
        { name: 'Bot-Version', value: pkg.version || 'unbekannt', inline: true },
        { name: 'discord.js', value: djsVersion, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'Server', value: String(client.guilds.cache.size), inline: true },
        { name: 'RAM-Nutzung', value: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`, inline: true },
        { name: 'Plattform', value: `${os.platform()} (${os.arch()})`, inline: true },
        { name: 'Uptime (ms)', value: String(uptimeMs), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

const automodSetup = {
  data: new SlashCommandBuilder()
    .setName('automod-setup')
    .setDescription('Richtet sinnvolle AutoMod-Regeln auf diesem Server ein')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: 'Dieser Befehl funktioniert nur auf einem Server, nicht per Direktnachricht.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const me = guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply(
        '❌ Mir fehlt die Berechtigung **"Server verwalten"** (Manage Guild) auf diesem Server. ' +
          'Bitte gib mir diese Berechtigung und führe den Befehl erneut aus.'
      );
      return;
    }

    let existingRules;
    try {
      existingRules = await guild.autoModerationRules.fetch();
    } catch (err) {
      console.error('Konnte bestehende AutoMod-Regeln nicht laden:', err);
      existingRules = new Map();
    }

    const existingNames = new Set([...existingRules.values()].map((r) => r.name));
    const definitions = buildAutoModRuleDefinitions();

    const created = [];
    const skipped = [];
    const failed = [];

    for (const def of definitions) {
      if (existingNames.has(def.name)) {
        skipped.push(def.name);
        continue;
      }

      try {
        await guild.autoModerationRules.create({
          ...def,
          enabled: true,
          reason: 'Eingerichtet über /automod-setup',
        });
        created.push(def.name);
      } catch (err) {
        console.error(`Konnte AutoMod-Regel "${def.name}" nicht erstellen:`, err);
        failed.push(`${def.name} — ${err.message}`);
      }
    }

    const lines = [];
    if (created.length) lines.push(`✅ Neu erstellt:\n${created.map((n) => `• ${n}`).join('\n')}`);
    if (skipped.length)
      lines.push(`↪️ Übersprungen (existierte bereits):\n${skipped.map((n) => `• ${n}`).join('\n')}`);
    if (failed.length) lines.push(`❌ Fehlgeschlagen:\n${failed.map((n) => `• ${n}`).join('\n')}`);
    if (lines.length === 0) lines.push('Es gab nichts zu tun.');

    lines.push(
      '',
      'ℹ️ **Hinweis zum AutoMod-Badge:** Discord vergibt das "Uses AutoMod"-Badge erst ab ' +
        '**100 aktiven AutoMod-Regeln über alle Server hinweg**, auf denen dieser Bot ist – nicht ' +
        'nur auf diesem einen Server. Mit `/botinfo` siehst du, auf wie vielen Servern der Bot aktuell ist.'
    );

    await interaction.editReply(lines.join('\n'));
  },
};

// ---------------------------------------------------------------------------
// Export: EIN Array mit allen Commands. index.js und deploy-commands.js
// verwenden beide dieses Array - kein Verzeichnis-Scan nötig.
// ---------------------------------------------------------------------------

module.exports = [antimdm, web, uptime, status, changelog, links, reload, botinfo, automodSetup];
