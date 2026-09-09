// commands/automod-setup.js
//
// Richtet auf dem aktuellen Server ein paar sinnvolle, echte AutoMod-Regeln ein:
// - Filter für anstößige Inhalte (Discords Keyword-Presets)
// - Schutz gegen Mention-Spam
// - Discords eingebaute Spam-Erkennung
// - Filter gegen Einladungslinks fremder Server
//
// Hinweis zum "Uses AutoMod"-Badge:
// Discord vergibt dieses Badge automatisch, wenn eine App/ein Bot insgesamt
// mindestens 100 AKTIVE AutoMod-Regeln über ALLE Server hinweg hat, auf denen
// sie/er ist. Das lässt sich nicht auf einem einzelnen Server erzwingen -
// jeder Server, der /automod-setup ausführt, trägt ein paar echte Regeln bei.
// Je mehr Server den Bot nutzen, desto näher kommt er den 100 Regeln.

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  AutoModerationRuleTriggerType,
  AutoModerationRuleEventType,
  AutoModerationActionType,
  AutoModerationRuleKeywordPresetType,
} = require('discord.js');

function buildRuleDefinitions() {
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

module.exports = {
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
          'Bitte gib mir diese Berechtigung (z.B. über eine Rolle) und führe den Befehl erneut aus.'
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
    const definitions = buildRuleDefinitions();

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
