// commands/web.js
const { SlashCommandBuilder } = require('discord.js');
const config = require('../lib/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('web')
    .setDescription('Zeigt den Link zur Website'),

  async execute(interaction) {
    const url =
      config.links.website || process.env.WEBSITE_URL || 'https://tylxrrrr.is-great.net';
    await interaction.reply(`Link: ${url}`);
  },
};
