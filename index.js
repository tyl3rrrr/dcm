// index.js
// Discord Bot - flache Struktur, kein Ordner-Scan.
//
// STATUS-HINWEIS ("lilaner Punkt"):
// Discord kennt für den kleinen Status-Punkt eigentlich nur vier Farben:
// grün (online), gelb (idle), rot (dnd), grau (invisible/offline) - eine
// generelle "lila"-Option gibt es dafür nicht. ABER: Wenn ein Nutzer/Bot
// eine Aktivität vom Typ "Streaming" hat, ersetzt Discord den Punkt durch
// ein lilanes "Play"-Symbol. Genau das nutzen wir hier: Der Bot bekommt
// zusätzlich zur "Watching <Website>"-Anzeige eine Streaming-Aktivität,
// wodurch der Status-Punkt lila wird.
//
// WICHTIG: Discord akzeptiert für den Streaming-Modus nur eine "url", die
// zu twitch.tv oder youtube.com gehört - sonst wird die Aktivität als
// normales "Spielt..." behandelt und der Punkt bleibt grün. Die URL kannst
// du in der .env über STREAM_URL anpassen (Platzhalter siehe .env).

const { Client, GatewayIntentBits, ActivityType, Events, Collection } = require('discord.js');

const config = require('./config');
const commandList = require('./commands');
const { OPEN_BUTTON_ID, CLOSE_BUTTON_ID, handleOpenTicket, handleCloseTicket } = require('./commands-tickets');

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

function setPresence(readyClient) {
  const streamUrl = process.env.STREAM_URL || 'https://twitch.tv/tylxrrrr';

  readyClient.user.setPresence({
    status: 'online',
    activities: [
      { name: config.links.website, type: ActivityType.Watching },
      { name: 'Live', type: ActivityType.Streaming, url: streamUrl },
    ],
  });
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Eingeloggt als ${readyClient.user.tag}`);
  setPresence(readyClient);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.warn(`Unbekannter Command aufgerufen: /${interaction.commandName}`);
        await interaction.reply({ content: 'Unbekannter Befehl.', ephemeral: true }).catch(() => {});
        return;
      }
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === OPEN_BUTTON_ID) {
        await handleOpenTicket(interaction);
        return;
      }
      if (interaction.customId === CLOSE_BUTTON_ID) {
        await handleCloseTicket(interaction);
        return;
      }
    }
  } catch (error) {
    console.error('Fehler beim Verarbeiten einer Interaktion:', error);

    const errorPayload = {
      content: 'Beim Ausführen dieser Aktion ist ein Fehler aufgetreten.',
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
