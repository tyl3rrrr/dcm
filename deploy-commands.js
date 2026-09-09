// deploy-commands.js
// Registriert die Slash-Commands bei Discord.
// Ausführen mit: npm run deploy   (bzw. node deploy-commands.js)
//
// Wenn GUILD_ID in der .env gesetzt ist, werden die Commands NUR für diesen
// einen Server registriert (Vorteil: sofort verfügbar, keine Wartezeit).
// Wenn GUILD_ID leer ist, werden die Commands GLOBAL registriert
// (Nachteil: kann bis zu ~1 Stunde dauern, bis sie überall sichtbar sind).

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error(
    'Fehler: DISCORD_TOKEN und/oder CLIENT_ID fehlen in der .env Datei. ' +
      'Bitte .env ausfüllen, bevor die Commands registriert werden.'
  );
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('antimdm')
    .setDescription('Sendet den AntiMDM-Link'),

  new SlashCommandBuilder()
    .setName('web')
    .setDescription('Zeigt den Link zur Website'),

  new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Zeigt an, wie lange der Bot schon läuft'),
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Starte Registrierung von ${commands.length} Slash-Command(s).`);

    let data;

    if (GUILD_ID && GUILD_ID.trim() !== '') {
      // Nur für einen bestimmten Server registrieren (schnell, ideal zum Testen)
      data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
      console.log(
        `Erfolgreich ${data.length} Command(s) für Server ${GUILD_ID} registriert.`
      );
    } else {
      // Global registrieren (dauert bis zu ~1 Stunde, bis überall sichtbar)
      data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands,
      });
      console.log(
        `Erfolgreich ${data.length} Command(s) global registriert. ` +
          'Hinweis: Es kann bis zu einer Stunde dauern, bis sie überall sichtbar sind.'
      );
    }
  } catch (error) {
    console.error('Fehler beim Registrieren der Slash-Commands:');
    console.error(error);
    process.exit(1);
  }
})();
