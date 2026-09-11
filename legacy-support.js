// legacy-support.js
//
// Textbasierter "!support"-Befehl (kein Slash-Command).
// - "!support config": Admin/Manage-Guild-Mitglied wird per Nachricht nach
//   der zu erwähnenden Rolle und dem Ziel-Kanal gefragt (Wizard).
// - "!support <Anliegen>": Leitet die Anfrage als Embed in den
//   eingestellten Kanal weiter und erwähnt die eingestellte Rolle.
//
// Der Bot verarbeitet NUR Nachrichten aus Servern (message.guild vorhanden).
// DMs an den Bot werden nicht verarbeitet - zusätzlich zur fehlenden
// DirectMessages-Gateway-Intent in index.js (der Bot bekommt DM-Events
// dadurch gar nicht erst zugestellt).

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');

const PREFIX = process.env.PREFIX || '!';
const COLLECT_TIMEOUT_MS = 30000;

async function handleConfig(message) {
  const member = message.member;
  if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await message.reply('❌ Nur Mitglieder mit der Berechtigung "Server verwalten" dürfen das Support-System konfigurieren.');
    return;
  }

  await message.reply(
    '⚙️ Support-Einrichtung gestartet.\n' +
      'Bitte **erwähne die Rolle** (z.B. `@Support`), die bei neuen Support-Anfragen benachrichtigt werden soll. (30 Sekunden Zeit)'
  );

  const roleCollected = await message.channel
    .awaitMessages({
      filter: (m) => m.author.id === message.author.id && m.mentions.roles.size > 0,
      max: 1,
      time: COLLECT_TIMEOUT_MS,
    })
    .catch(() => null);

  if (!roleCollected || roleCollected.size === 0) {
    await message.reply(`❌ Zeit abgelaufen oder keine Rolle erkannt. Bitte \`${PREFIX}support config\` erneut ausführen.`);
    return;
  }
  const role = roleCollected.first().mentions.roles.first();

  await message.reply(
    '✅ Rolle gespeichert.\nJetzt bitte **den Kanal erwähnen** (z.B. `#support-tickets`), in dem die Support-Nachrichten gepostet werden sollen. (30 Sekunden Zeit)'
  );

  const channelCollected = await message.channel
    .awaitMessages({
      filter: (m) => m.author.id === message.author.id && m.mentions.channels.size > 0,
      max: 1,
      time: COLLECT_TIMEOUT_MS,
    })
    .catch(() => null);

  if (!channelCollected || channelCollected.size === 0) {
    await message.reply(`❌ Zeit abgelaufen oder kein Kanal erkannt. Bitte \`${PREFIX}support config\` erneut ausführen.`);
    return;
  }
  const targetChannel = channelCollected.first().mentions.channels.first();

  storage.setGuildSetting(message.guild.id, 'supportRoleId', role.id);
  storage.setGuildSetting(message.guild.id, 'supportChannelId', targetChannel.id);

  await message.reply(
    `✅ Support-System eingerichtet!\n• Rolle: <@&${role.id}>\n• Kanal: <#${targetChannel.id}>\n\n` +
      `Nutzer können jetzt mit \`${PREFIX}support <Anliegen>\` eine Anfrage stellen.`
  );
}

async function handleSupportRequest(message, text) {
  const settings = storage.getGuildSettings(message.guild.id);

  if (!settings.supportRoleId || !settings.supportChannelId) {
    await message.reply(
      `❌ Das Support-System ist noch nicht eingerichtet. Ein Admin muss zuerst \`${PREFIX}support config\` ausführen.`
    );
    return;
  }

  const targetChannel = message.guild.channels.cache.get(settings.supportChannelId);
  if (!targetChannel) {
    await message.reply(`❌ Der eingestellte Support-Kanal existiert nicht mehr. Bitte per \`${PREFIX}support config\` neu einrichten.`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🆘 Neue Support-Anfrage')
    .setDescription(text)
    .addFields(
      { name: 'Von', value: `<@${message.author.id}> (${message.author.tag})` },
      { name: 'Ursprungskanal', value: `<#${message.channel.id}>` }
    )
    .setColor(0x5865f2)
    .setTimestamp();

  try {
    await targetChannel.send({ content: `<@&${settings.supportRoleId}>`, embeds: [embed] });
    await message.reply('✅ Deine Support-Anfrage wurde weitergeleitet. Das Team meldet sich bei dir.');
  } catch (err) {
    console.error('Fehler beim Weiterleiten der Support-Anfrage:', err);
    await message.reply('❌ Deine Anfrage konnte nicht weitergeleitet werden. Bitte informiere einen Admin direkt.');
  }
}

async function handleMessage(message) {
  if (message.author.bot) return;
  if (!message.guild) return; // Keine DM-Verarbeitung (siehe Kommentar oben)
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = (args.shift() || '').toLowerCase();
  if (command !== 'support') return;

  const sub = (args[0] || '').toLowerCase();

  if (sub === 'config') {
    args.shift();
    await handleConfig(message);
    return;
  }

  const text = args.join(' ').trim();
  if (!text) {
    await message.reply(`Bitte gib dein Anliegen an, z.B. \`${PREFIX}support Ich brauche Hilfe bei...\``);
    return;
  }
  await handleSupportRequest(message, text);
}

module.exports = { handleMessage };
