// commands/status.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../lib/config');

const TIMEOUT_MS = 6000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Prüft, ob die Website erreichbar ist'),

  async execute(interaction) {
    await interaction.deferReply();

    const url = config.links.website || process.env.WEBSITE_URL || 'https://tylxrrrr.is-great.net';

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
      });
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
