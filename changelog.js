// commands/changelog.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../lib/config');

const MAX_ENTRIES_SHOWN = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('Zeigt die letzten Updates des Projekts'),

  async execute(interaction) {
    const entries = config.changelog;

    if (!entries || entries.length === 0) {
      await interaction.reply({
        content: 'Es sind noch keine Changelog-Einträge vorhanden (config/changelog.json).',
        ephemeral: true,
      });
      return;
    }

    const latest = entries.slice(-MAX_ENTRIES_SHOWN).reverse();

    const embed = new EmbedBuilder()
      .setTitle('📋 Changelog')
      .setColor(0x5865f2)
      .setDescription(
        latest.map((e) => `**${e.date || '?'}** — ${e.text || '(kein Text)'}`).join('\n\n')
      )
      .setFooter({ text: `Letzte ${latest.length} von ${entries.length} Einträgen` });

    await interaction.reply({ embeds: [embed] });
  },
};
