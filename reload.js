// commands/reload.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../lib/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Lädt .env, links.json und changelog.json neu, ohne den Bot neuzustarten')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const ownerId = process.env.OWNER_ID;

    // Zusätzliche Absicherung: Wenn OWNER_ID gesetzt ist, darf nur dieser Nutzer
    // die (bot-globale) Konfiguration neu laden - unabhängig von Server-Rollen.
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
        content:
          '✅ Konfiguration wurde neu geladen (`.env`, `config/links.json`, `config/changelog.json`).',
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
