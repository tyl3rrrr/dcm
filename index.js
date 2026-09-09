// index.js
// Discord Bot mit den Slash-Commands /antimdm, /web, /uptime
// Status: "Watching https://tylxrrrr.is-great.net"

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  Events,
} = require('discord.js');

const { DISCORD_TOKEN, WEBSITE_URL, ANTIMDM_LINK } = process.env;

if (!DISCORD_TOKEN) {
  console.error(
    'Fehler: DISCORD_TOKEN fehlt in der .env Datei. Bot kann nicht starten.'
  );
  process.exit(1);
}

// Fallback-Werte, falls in der .env vergessen
const websiteUrl = WEBSITE_URL || 'https://tylxrrrr.is-great.net';
const antimdmLink = ANTIMDM_LINK || 'https://tinyurl.com/vr27mahv';

// Für Slash-Commands reicht der Intent "Guilds" völlig aus.
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Zeitpunkt, an dem der Bot gestartet wurde (für /uptime)
const startTime = Date.now();

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

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Eingeloggt als ${readyClient.user.tag}`);

  // Status setzen: "Watching https://tylxrrrr.is-great.net"
  readyClient.user.setPresence({
    activities: [
      {
        name: websiteUrl,
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'antimdm': {
        await interaction.reply(antimdmLink);
        break;
      }

      case 'web': {
        await interaction.reply(`Link: ${websiteUrl}`);
        break;
      }

      case 'uptime': {
        const uptimeMs = Date.now() - startTime;
        await interaction.reply(`⏱️ Uptime: ${formatUptime(uptimeMs)}`);
        break;
      }

      default: {
        // Unbekannter Command (sollte nach korrektem Deploy nicht vorkommen)
        await interaction.reply({
          content: 'Unbekannter Befehl.',
          ephemeral: true,
        });
      }
    }
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

// Grundlegende Fehlerbehandlung, damit der Bot nicht ohne Meldung abstürzt
client.on(Events.Error, (error) => {
  console.error('Discord-Client-Fehler:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unbehandelte Promise-Ablehnung:', error);
});

client.login(DISCORD_TOKEN);
