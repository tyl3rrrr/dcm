// commands-automod.js
//
// BUGFIX gegenüber der Vorversion:
// 1. `guild.members.me` nutzt nur den lokalen Cache und kann null/veraltet
//    sein, wenn der Member-Cache nicht aktuell ist -> der Bot dachte
//    fälschlich, ihm fehle die Berechtigung. Jetzt wird stattdessen
//    `guild.members.fetchMe()` genutzt, das den aktuellen Stand per
//    REST-Call direkt von Discord holt.
// 2. Die "Spam"-Regel hatte `triggerMetadata: {}` (leeres Objekt). Discord
//    lehnt das bei manchen Trigger-Typen mit "Invalid Form Body" ab, wenn
//    ein trigger_metadata-Feld mitgeschickt wird, das für diesen Typ nicht
//    erwartet wird. Jetzt wird das Feld komplett weggelassen, wenn nicht
//    benötigt.
// 3. Fehler pro Regel werden jetzt mit Discord-Fehlercode UND -meldung
//    ausgegeben, damit man im Fehlerfall sofort sieht, woran es liegt,
//    statt nur einer generischen Meldung.

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
      // Kein triggerMetadata-Feld! Discord erwartet für den Spam-Trigger
      // KEINE trigger_metadata - Feld weglassen statt {} zu senden.
      name: '[AutoBot] Filter: Spam-Erkennung',
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Spam,
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

    // Fix: fetchMe() statt guild.members.me, um veralteten Cache zu vermeiden.
    let me;
    try {
      me = await guild.members.fetchMe();
    } catch (err) {
      console.error('Konnte eigenes Member-Objekt nicht laden:', err);
      await interaction.editReply(
        `❌ Konnte meine eigenen Berechtigungen nicht prüfen (${err.message}). ` +
          'Bitte stelle sicher, dass der Bot noch auf dem Server ist, und versuche es erneut.'
      );
      return;
    }

    if (!me.permissions.has(PermissionFlagsBits.ManageGuild)) {
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
      await interaction.editReply(
        `❌ Konnte bestehende AutoMod-Regeln nicht laden: **${err.message}** ` +
          `(Code: ${err.code || 'unbekannt'}). Bitte prüfe, ob AutoMod auf diesem Server verfügbar ist.`
      );
      return;
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
        const code = err.code !== undefined ? ` (Code ${err.code})` : '';
        failed.push(`${def.name} — ${err.message}${code}`);
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
        '**100 aktiven AutoMod-Regeln über alle Server hinweg**, auf denen dieser Bot ist. ' +
        'Mit `/botinfo` siehst du, auf wie vielen Servern der Bot aktuell ist.'
    );

    await interaction.editReply(lines.join('\n'));
  },
};

module.exports = { automodSetup };
