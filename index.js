// index.js
// Discord Bot: importiert alle Commands direkt aus commands.js (KEIN
// commands/-Ordner, kein fs.readdirSync), setzt den Status auf
// "Watching <Website>" und verarbeitet eingehende Slash-Command-Interaktionen.

const { Client, GatewayIntentBits, ActivityType, Events, Collection } = require('discord.js');

const config = require('./config');
const commandList = require('./commands');

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('Fehler: DISCORD_TOKEN fehlt in der .env Datei. Bot kann nicht starten.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

for (const command of commandList) {
  if (!command || !command.data || typeof command.execute !== 'function') {
    console.warn('Warnung: Ein Command-Modul ist ungültig (fehlt data oder execute) - wird übersprungen.');
    continue;
  }
  client.commands.set(command.data.name, command);
}

console.log(`${client.commands.size} Command(s) geladen: ${[...client.commands.keys()].join(', ')}`);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Eingeloggt als ${readyClient.user.tag}`);

  readyClient.user.setPresence({
    activities: [
      {
        name: config.links.website,
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.warn(`Unbekannter Command aufgerufen: /${interaction.commandName}`);
    await interaction.reply({ content: 'Unbekannter Befehl.', ephemeral: true }).catch(() => {});
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Fehler beim Ausführen von /${interaction.commandName}:`, error);

    const errorPayload = {
      content: 'Beim Ausführen dieses Befehls ist ein Fehler aufgetreten.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorPayload).catch(() => {});
    } else {
      await interaction.reply(errorPayload).catch(() => {});
    }
  }
});

client.on(Events.Error, (error) => {
  console.error('Discord-Client-Fehler:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unbehandelte Promise-Ablehnung:', error);
});

client.login(DISCORD_TOKEN);
