// commands-welcome.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const storage = require('./storage');

const welcomeSetup = {
  data: new SlashCommandBuilder()
    .setName('welcome-setup')
    .setDescription('Konfiguriert das Welcome-System für diesen Server')
    .setDMPermission(false)
    .addRoleOption(o => o.setName('role').setDescription('Rolle für neue Mitglieder').setRequired(false))
    .addChannelOption(o => o.setName('channel').setDescription('Öffentlicher Welcome-Channel').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addBooleanOption(o => o.setName('dm').setDescription('Welcome-Nachricht per DM aktivieren').setRequired(false))
    .addBooleanOption(o => o.setName('enabled').setDescription('Welcome-System aktivieren/deaktivieren').setRequired(false)),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const channel = interaction.options.getChannel('channel');
    const dm = interaction.options.getBoolean('dm');
    const enabled = interaction.options.getBoolean('enabled');
    const current = storage.getGuildSettings(interaction.guild.id);
    const patch = {};
    if (role !== null) patch.welcomeRoleId = role.id;
    if (channel !== null) patch.welcomeChannelId = channel.id;
    if (dm !== null) patch.welcomeDm = dm;
    if (enabled !== null) patch.welcomeEnabled = enabled;
    if (Object.keys(patch).length === 0) {
      const s = current;
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('👋 Welcome-System')
          .setColor(0x5865f2)
          .addFields(
            { name: 'Aktiv', value: s.welcomeEnabled === false ? 'Nein' : 'Ja', inline: true },
            { name: 'Rolle', value: s.welcomeRoleId ? `<@&${s.welcomeRoleId}>` : 'Nicht gesetzt', inline: true },
            { name: 'Channel', value: s.welcomeChannelId ? `<#${s.welcomeChannelId}>` : 'Nicht gesetzt', inline: true },
            { name: 'DM', value: s.welcomeDm ? 'Ja' : 'Nein', inline: true },
          )], ephemeral: true
      });
      return;
    }
    storage.updateGuildSettings(interaction.guild.id, patch);
    await interaction.reply({ content: '✅ Welcome-Einstellungen gespeichert.', ephemeral: true });
  }
};

async function handleGuildMemberAdd(member) {
  const s = storage.getGuildSettings(member.guild.id);
  if (s.welcomeEnabled === false) return;
  const number = storage.nextWelcomeMemberNumber(member.guild.id, Math.max(0, member.guild.memberCount - 1));
  if (s.welcomeRoleId) {
    const role = member.guild.roles.cache.get(s.welcomeRoleId);
    if (role) await member.roles.add(role, 'Welcome-System').catch(err => console.warn('Welcome-Rolle konnte nicht vergeben werden:', err.message));
  }
  const text = `Welcome to the Server ${member}! You are Member Number ${number}`;
  if (s.welcomeChannelId) {
    const channel = member.guild.channels.cache.get(s.welcomeChannelId);
    if (channel?.isTextBased()) await channel.send(text).catch(() => {});
  }
  if (s.welcomeDm) await member.send(text).catch(() => {});
  return number;
}

module.exports = { welcomeSetup, handleGuildMemberAdd };
