// commands/uptime.js
const { SlashCommandBuilder } = require('discord.js');

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Zeigt an, wie lange der Bot schon läuft'),

  async execute(interaction) {
    const readyAt = interaction.client.readyTimestamp || Date.now();
    const uptimeMs = Date.now() - readyAt;
    await interaction.reply(`⏱️ Uptime: ${formatUptime(uptimeMs)}`);
  },
};
