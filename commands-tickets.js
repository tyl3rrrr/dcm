// commands-tickets.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const storage = require('./storage');

const OPEN_BUTTON_ID = 'ticket_open';
const CLOSE_BUTTON_ID = 'ticket_close';

function sanitizeChannelName(username) {
  return `ticket-${username}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);
}

const ticketPanel = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Postet ein Panel, über das Nutzer Support-Tickets öffnen können')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const settings = storage.getGuildSettings(interaction.guild.id);

    if (!settings.ticketCategoryId) {
      await interaction.reply({
        content:
          '❌ Es ist noch keine Ticket-Kategorie eingestellt. Bitte zuerst `/settings ticket-category` ausführen.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 Support-Ticket')
      .setDescription('Klicke auf den Button unten, um ein privates Support-Ticket zu öffnen.')
      .setColor(0x5865f2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(OPEN_BUTTON_ID).setLabel('Ticket erstellen').setStyle(ButtonStyle.Primary).setEmoji('🎫')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

async function handleOpenTicket(interaction) {
  const guild = interaction.guild;
  const settings = storage.getGuildSettings(guild.id);

  if (!settings.ticketCategoryId) {
    await interaction.reply({
      content: '❌ Es ist noch keine Ticket-Kategorie eingestellt. Ein Admin muss zuerst `/settings ticket-category` ausführen.',
      ephemeral: true,
    });
    return;
  }

  const category = guild.channels.cache.get(settings.ticketCategoryId);
  if (!category) {
    await interaction.reply({
      content: '❌ Die eingestellte Ticket-Kategorie existiert nicht mehr. Bitte per `/settings ticket-category` neu setzen.',
      ephemeral: true,
    });
    return;
  }

  // Prüfen, ob der Nutzer bereits ein offenes Ticket hat (Topic = User-ID)
  const existing = category.children?.cache?.find((ch) => ch.topic === interaction.user.id);
  if (existing) {
    await interaction.reply({ content: `❗ Du hast bereits ein offenes Ticket: ${existing.toString()}`, ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  let me;
  try {
    me = await guild.members.fetchMe();
  } catch (err) {
    await interaction.editReply(`❌ Konnte eigene Berechtigungen nicht prüfen: ${err.message}`);
    return;
  }

  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.editReply('❌ Mir fehlt die Berechtigung "Kanäle verwalten", um ein Ticket zu erstellen.');
    return;
  }

  const permissionOverwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    {
      id: me.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
    },
  ];

  if (settings.ticketStaffRoleId) {
    permissionOverwrites.push({
      id: settings.ticketStaffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  try {
    const ticketNumber = storage.nextTicketNumber(guild.id);
    const channel = await guild.channels.create({
      name: sanitizeChannelName(interaction.user.username),
      type: ChannelType.GuildText,
      parent: category.id,
      topic: interaction.user.id,
      permissionOverwrites,
      reason: `Ticket #${ticketNumber} von ${interaction.user.tag}`,
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎫 Ticket #${ticketNumber}`)
      .setDescription(
        `Hallo <@${interaction.user.id}>! Beschreibe dein Problem oder deine Frage - das Support-Team meldet sich hier.`
      )
      .setColor(0x5865f2);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(CLOSE_BUTTON_ID).setLabel('Ticket schließen').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    await channel.send({
      content: settings.ticketStaffRoleId ? `<@&${settings.ticketStaffRoleId}>` : undefined,
      embeds: [embed],
      components: [closeRow],
    });

    await interaction.editReply(`✅ Dein Ticket wurde erstellt: ${channel.toString()}`);

    if (settings.logChannelId) {
      const logChannel = guild.channels.cache.get(settings.logChannelId);
      if (logChannel && logChannel.isTextBased()) {
        await logChannel
          .send(`🎫 Ticket #${ticketNumber} von **${interaction.user.tag}** erstellt: ${channel.toString()}`)
          .catch(() => {});
      }
    }
  } catch (err) {
    console.error('Fehler beim Erstellen des Ticket-Kanals:', err);
    await interaction.editReply(`❌ Konnte kein Ticket erstellen: ${err.message}`);
  }
}

async function handleCloseTicket(interaction) {
  const channel = interaction.channel;
  const guild = interaction.guild;
  const settings = storage.getGuildSettings(guild.id);

  const isOwner = channel.topic === interaction.user.id;
  const member = interaction.member;
  const isStaff =
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    (settings.ticketStaffRoleId && member.roles.cache.has(settings.ticketStaffRoleId));

  if (!isOwner && !isStaff) {
    await interaction.reply({ content: '❌ Nur der Ticket-Ersteller oder das Support-Team kann dieses Ticket schließen.', ephemeral: true });
    return;
  }

  await interaction.reply('🔒 Dieses Ticket wird in 5 Sekunden geschlossen...');

  if (settings.logChannelId) {
    const logChannel = guild.channels.cache.get(settings.logChannelId);
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send(`🔒 Ticket **${channel.name}** wurde von **${interaction.user.tag}** geschlossen.`).catch(() => {});
    }
  }

  setTimeout(async () => {
    try {
      await channel.delete('Ticket geschlossen');
    } catch (err) {
      console.error('Fehler beim Löschen des Ticket-Kanals:', err);
    }
  }, 5000);
}

module.exports = {
  ticketPanel,
  OPEN_BUTTON_ID,
  CLOSE_BUTTON_ID,
  handleOpenTicket,
  handleCloseTicket,
};
