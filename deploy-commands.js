require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { syncCommands } = require('./command-sync');

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error('❌ DISCORD_TOKEN oder CLIENT_ID fehlt.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  try {
    const result = await syncCommands(client);
    console.log(`✅ ${result.count} Slash-Commands synchronisiert (${result.scope}).`);
    for (const guild of result.guilds || []) {
      console.log(guild.error
        ? `❌ ${guild.guildName || guild.guildId}: ${guild.error}`
        : `✅ ${guild.guildName || guild.guildId}: ${guild.count} Commands`);
    }
  } catch (e) {
    console.error('❌ Registrierung fehlgeschlagen:', e);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Discord-Login fehlgeschlagen:', err.message);
  process.exit(1);
});
