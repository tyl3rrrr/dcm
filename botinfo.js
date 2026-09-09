// commands/botinfo.js
const os = require('os');
const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const pkg = require('../package.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Zeigt technische Informationen über den Bot'),

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
