// commands/links.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../lib/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('links')
    .setDescription('Zeigt wichtige Links zum Projekt'),

  async execute(interaction) {
    const l = config.links || {};
    const fields = [];

    if (l.website) fields.push({ name: '🌐 Website', value: l.website });
    if (l.discordInvite) fields.push({ name: '💬 Discord-Server', value: l.discordInvite });
    if (l.github) fields.push({ name: '🐙 GitHub', value: l.github });
    if (l.antimdm) fields.push({ name: '🛡️ AntiMDM', value: l.antimdm });

    if (fields.length === 0) {
      await interaction.reply({
        content: 'Es sind noch keine Links konfiguriert (config/links.json).',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔗 Wichtige Links')
      .setColor(0x5865f2)
      .addFields(fields);

    await interaction.reply({ embeds: [embed] });
  },
};
