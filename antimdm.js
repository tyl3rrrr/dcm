// commands/antimdm.js
const { SlashCommandBuilder } = require('discord.js');
const config = require('../lib/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antimdm')
    .setDescription('Sendet den AntiMDM-Link'),

  async execute(interaction) {
    const link =
      config.links.antimdm || process.env.ANTIMDM_LINK || 'https://tinyurl.com/vr27mahv';
    await interaction.reply(link);
  },
};
