// index.js
// Discord Bot - flache Struktur, kein Ordner-Scan.
//
// STATUS-HINWEIS ("lilaner Punkt") - v2 Fix:
// Die Vorversion setzte ZWEI Aktivitäten gleichzeitig (Watching + Streaming).
// Berichte/Community-Threads zu genau diesem Verhalten zeigen, dass Discord
// bei mehreren Aktivitäten nicht zuverlässig die lilane Streaming-Badge
// anzeigt - oft gewinnt die zuerst gesendete Aktivität, oder der Client
// zeigt gar keine Badge. Jetzt wird NUR EINE Aktivität vom Typ "Streaming"
// gesetzt (Name = Website-Text, damit die Website trotzdem sichtbar bleibt:
// "Streaming https://...").
//
// WICHTIG (von Discord selbst so vorgegeben, nicht änderbar): Die "url" MUSS
// zu twitch.tv oder youtube.com gehören und exakt wie eine echte URL
// aussehen (inkl. "https://www."), sonst wird die Badge nicht lila, sondern
// bleibt grün. Anpassbar über STREAM_URL in der .env.

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, ActivityType, Events, Collection, Options } = require('discord.js');

const config = require('./config');
const commandList = require('./commands');
const { OPEN_BUTTON_ID, CLOSE_BUTTON_ID, handleOpenTicket, handleCloseTicket } = require('./commands-tickets');
const legacySupport = require('./legacy-support');

// ---------------------------------------------------------------------------
// BUGFIX "unendliche/doppelte Nachrichten": Die wahrscheinlichste Ursache
// war, dass der Bot-PROZESS zweimal gleichzeitig lief (z.B. weil ein alter
// Prozess beim Neustart nicht beendet wurde). Discord schickt Nachrichten-
// und Interaktions-Events an JEDE aktive Verbindung mit demselben Token -
// bei zwei laufenden Prozessen wird deshalb jede Aktion zweimal ausgeführt
// (doppelte DMs, doppelte Support-Anfragen, etc.).
//
// Diese einfache Sperrdatei verhindert das: Beim Start wird geprüft, ob
// bereits ein anderer, noch laufender Prozess eine bot.lock-Datei hält.
// Falls ja, wird der Start abgebrochen und eine klare Fehlermeldung
// ausgegeben, statt dass zwei Instanzen gleichzeitig laufen.
// ---------------------------------------------------------------------------
const LOCK_FILE = path.join(__dirname, 'bot.lock');

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false; // Prozess existiert nicht (mehr)
  }
}

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const existingPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
    if (!Number.isNaN(existingPid) && isProcessAlive(existingPid)) {
      console.error(
        `❌ Der Bot läuft bereits in einem anderen Prozess (PID ${existingPid})!\n` +
          'Genau DAS verursacht doppelte/"unendliche" Nachrichten (Discord schickt Events an beide Prozesse).\n' +
          `Bitte beende den anderen Prozess (z.B. "kill ${existingPid}" oder den Task-Manager) und starte danach neu.\n` +
          `Falls du sicher bist, dass kein anderer Prozess läuft, lösche einfach die Datei "bot.lock" und starte erneut.`
      );
      process.exit(1);
    }
    // Alte, verwaiste Lock-Datei (Prozess existiert nicht mehr) - überschreiben.
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf8');
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  } catch (err) {
    // Ignorieren - beim Herunterfahren nicht kritisch.
  }
}

acquireLock();
process.on('exit', releaseLock);
process.on('SIGINT', () => {
  releaseLock();
  process.exit(0);
});
process.on('SIGTERM', () => {
  releaseLock();
  process.exit(0);
});

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('Fehler: DISCORD_TOKEN fehlt in der .env Datei. Bot kann nicht starten.');
  process.exit(1);
}

// WICHTIG zu den Intents:
// - Guilds: Grundvoraussetzung für Slash-Commands.
// - GuildMessages + MessageContent: nötig, damit der Bot den Text von
//   Nachrichten in Servern lesen kann (für den "!support"-Text-Befehl).
//   MessageContent ist ein PRIVILEGIERTER Intent - im Discord Developer
//   Portal unter "Bot" -> "Privileged Gateway Intents" -> "MESSAGE CONTENT
//   INTENT" aktivieren, sonst ist message.content immer leer!
// - DirectMessages wird BEWUSST NICHT angefordert: Dadurch bekommt der Bot
//   gar keine Gateway-Events für DMs von Nutzern - er kann also technisch
//   keine DMs "empfangen" bzw. verarbeiten. Senden von DMs (z.B. bei /warn)
//   funktioniert davon unabhängig weiterhin, siehe dm-notify.js.
// ---------------------------------------------------------------------------
// RAM-OPTIMIERUNG (Ziel: zuverlässig unter 2GB RAM laufen, Host nicht
// einfrieren lassen):
//
// discord.js cacht standardmäßig sehr viel (jede gesehene Nachricht, jeden
// Member, jede Reaction, ...) - bei Servern mit vielen Nachrichten/Mitgliedern
// wächst der Speicherverbrauch dadurch unbegrenzt. Wir schränken das gezielt
// auf das ein, was der Bot tatsächlich braucht:
// - Nachrichten: nur die letzten 50 pro Kanal im Cache behalten (für /clear,
//   /purge-user reicht ein frischer fetch() ohnehin, der Cache ist nur ein
//   Beschleuniger).
// - Reactions/Presences/Stage-Instanzen/Scheduled-Events/Invites/Bans/
//   Voice-States: wird von diesem Bot NICHT genutzt -> komplett deaktiviert
//   (0 = nichts cachen).
// - Member-Cache: auf 200 pro Server begrenzt (Berechtigungsprüfungen laufen
//   ohnehin meist über frische fetchMe()-Aufrufe, siehe commands-tickets.js).
//
// Zusätzlich: "sweepers" räumen periodisch alte, nicht mehr benötigte
// Nachrichten aus dem Cache, statt dass er nur wächst.
// ---------------------------------------------------------------------------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  makeCache: Options.cacheWithLimits({
    MessageManager: 50,
    ReactionManager: 0,
    PresenceManager: 0,
    GuildMemberManager: 200,
    ThreadManager: 25,
    GuildBanManager: 0,
    GuildInviteManager: 0,
    GuildScheduledEventManager: 0,
    StageInstanceManager: 0,
    VoiceStateManager: 0,
    ApplicationCommandManager: 0,
    AutoModerationRuleManager: 0,
  }),
  sweepers: {
    messages: {
      interval: 1800, // alle 30 Minuten prüfen
      lifetime: 900, // Nachrichten älter als 15 Minuten aus dem Cache entfernen
    },
    threads: {
      interval: 3600,
      lifetime: 3600,
    },
  },
});

client.commands = new Collection();
for (const command of commandList) {
  if (!command || !command.data || typeof command.execute !== 'function') {
    console.warn('Warnung: Ein Command-Modul ist ungültig (fehlt data oder execute) - wird übersprungen.');
    continue;
  }
  client.commands.set(command.data.name, command);
}

console.log('='.repeat(60));
console.log(`🚀 Bot-Prozess gestartet - PID: ${process.pid}`);
console.log(`📦 Node.js: ${process.version}`);
console.log(`${client.commands.size} Command(s) geladen: ${[...client.commands.keys()].join(', ')}`);
console.log(
  'ℹ️ Falls hier ein Befehl fehlt, den du gerade hinzugefügt hast: ' +
    'Dieser Prozess wurde VOR der Änderung gestartet - Bot komplett neu starten ' +
    '(nicht nur "npm run deploy"). Prüfe zusätzlich mit "ps aux | grep node" ' +
    '(Linux/Mac) bzw. "tasklist | findstr node" (Windows), ob nur EIN Prozess läuft.'
);
console.log('='.repeat(60));

function setPresence(readyClient) {
  const streamUrl = process.env.STREAM_URL || 'https://www.twitch.tv/0tylxrrrr';

  readyClient.user.setPresence({
    status: 'online',
    activities: [{ name: config.links.website, type: ActivityType.Streaming, url: streamUrl }],
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

client.on(Events.MessageCreate, async (message) => {
  try {
    await legacySupport.handleMessage(message);
  } catch (error) {
    console.error('Fehler beim Verarbeiten einer Nachricht (!support):', error);
  }
});

client.on(Events.Error, (error) => {
  console.error('Discord-Client-Fehler:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unbehandelte Promise-Ablehnung:', error);
});

client.login(DISCORD_TOKEN);
