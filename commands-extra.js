// commands-extra.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function isMissingPermError(err) {
  return err && (err.code === 50013 || err.code === '50013');
}

const ping = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Zeigt die aktuelle Verbindungs-Latenz'),
  async execute(interaction) {
    const sent = Date.now();
    await interaction.reply('🏓 Pinge...');
    const roundtrip = Date.now() - sent;
    const wsPing = Math.round(interaction.client.ws.ping);
    await interaction.editReply(`🏓 Pong! Bot-Antwortzeit: ${roundtrip} ms | WebSocket: ${wsPing} ms`);
  },
};

const remindme = {
  data: new SlashCommandBuilder()
    .setName('remindme')
    .setDescription('Erinnert dich per Nachricht nach einer bestimmten Zeit')
    .addIntegerOption((opt) =>
      opt.setName('minuten').setDescription('In wie vielen Minuten?').setMinValue(1).setMaxValue(1440).setRequired(true)
    )
    .addStringOption((opt) => opt.setName('text').setDescription('Woran soll erinnert werden?').setRequired(true)),

  async execute(interaction) {
    const minutes = interaction.options.getInteger('minuten');
    const text = interaction.options.getString('text');

    await interaction.reply({
      content: `⏰ Ok, ich erinnere dich in ${minutes} Minute(n) an: "${text}"`,
      ephemeral: true,
    });

    // Hinweis: Läuft nur im Arbeitsspeicher - geht bei einem Neustart des
    // Bots verloren. Für wichtige/lange Erinnerungen ggf. selbst notieren.
    setTimeout(() => {
      interaction.followUp({ content: `⏰ <@${interaction.user.id}> Erinnerung: ${text}` }).catch(() => {});
    }, minutes * 60 * 1000);
  },
};

const suggest = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Postet einen Vorschlag in diesem Kanal (mit Abstimmungs-Reaktionen)')
    .addStringOption((opt) => opt.setName('vorschlag').setDescription('Dein Vorschlag').setRequired(true)),

  async execute(interaction) {
    const text = interaction.options.getString('vorschlag');
    const embed = new EmbedBuilder()
      .setTitle('💡 Neuer Vorschlag')
      .setDescription(text)
      .setColor(0x5865f2)
      .setFooter({ text: `Vorgeschlagen von ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();
    await message.react('👍').catch(() => {});
    await message.react('👎').catch(() => {});
  },
};

const role = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Gibt einem Mitglied eine Rolle oder entfernt sie')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Gibt einem Mitglied eine Rolle')
        .addUserOption((opt) => opt.setName('user').setDescription('Das Mitglied').setRequired(true))
        .addRoleOption((opt) => opt.setName('rolle').setDescription('Die Rolle').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Entfernt eine Rolle von einem Mitglied')
        .addUserOption((opt) => opt.setName('user').setDescription('Das Mitglied').setRequired(true))
        .addRoleOption((opt) => opt.setName('rolle').setDescription('Die Rolle').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.options.getMember('user');
    const targetRole = interaction.options.getRole('rolle');

    if (!member) {
      await interaction.reply({ content: '❌ Dieses Mitglied konnte nicht gefunden werden.', ephemeral: true });
      return;
    }

    try {
      if (sub === 'add') {
        await member.roles.add(targetRole);
        await interaction.reply(`✅ Rolle **${targetRole.name}** wurde **${member.user.tag}** gegeben.`);
      } else {
        await member.roles.remove(targetRole);
        await interaction.reply(`✅ Rolle **${targetRole.name}** wurde **${member.user.tag}** entfernt.`);
      }
    } catch (err) {
      console.error('Fehler bei /role:', err);
      await interaction.reply({
        content: isMissingPermError(err)
          ? '❌ Mir fehlt die Berechtigung, diese Rolle zu verwalten (evtl. höher als meine eigene Rolle).'
          : `❌ Fehler: ${err.message}`,
        ephemeral: true,
      });
    }
  },
};

const purgeUser = {
  data: new SlashCommandBuilder()
    .setName('purge-user')
    .setDescription('Löscht die letzten Nachrichten eines bestimmten Nutzers in diesem Kanal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addUserOption((opt) => opt.setName('user').setDescription('Dessen Nachrichten gelöscht werden sollen').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('durchsuchen').setDescription('Wie viele Nachrichten im Kanal durchsucht werden (max. 100)').setMinValue(1).setMaxValue(100).setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const scanAmount = interaction.options.getInteger('durchsuchen') || 100;

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await interaction.channel.messages.fetch({ limit: scanAmount });
      const toDelete = messages.filter((m) => m.author.id === targetUser.id);
      const deleted = await interaction.channel.bulkDelete(toDelete, true);
      await interaction.editReply(`🧹 ${deleted.size} Nachricht(en) von **${targetUser.tag}** gelöscht.`);
    } catch (err) {
      console.error('Fehler bei /purge-user:', err);
      await interaction.editReply(
        isMissingPermError(err)
          ? '❌ Mir fehlt die Berechtigung, Nachrichten in diesem Kanal zu löschen.'
          : `❌ Fehler: ${err.message} (Discord kann nur Nachrichten löschen, die jünger als 14 Tage sind.)`
      );
    }
  },
};

module.exports = { ping, remindme, suggest, role, purgeUser };
