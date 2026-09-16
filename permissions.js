// permissions.js
// Zentrale Berechtigungsprüfung für Moderation/Admin-Dashboard.
// Owner > Discord Administrator > konfigurierte Admin-Rolle > konfigurierte Moderator-Rolle.
const { PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');

const ACCESS = Object.freeze({ USER: 'user', MOD: 'mod', ADMIN: 'admin', OWNER: 'owner' });

async function getMember(interaction) {
  if (!interaction.guild || !interaction.member) return null;
  if (interaction.member.permissions) return interaction.member;
  return interaction.guild.members.fetch(interaction.user.id).catch(() => null);
}

async function hasAccess(interaction, level = ACCESS.MOD) {
  const guild = interaction.guild;
  if (!guild) return false;
  if (interaction.user.id === guild.ownerId) return true;
  const member = await getMember(interaction);
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const s = storage.getGuildSettings(guild.id);
  if (level === ACCESS.ADMIN || level === ACCESS.MOD) {
    if (s.adminRoleId && member.roles.cache.has(s.adminRoleId)) return true;
  }
  if (level === ACCESS.MOD) {
    if (s.moderatorRoleId && member.roles.cache.has(s.moderatorRoleId)) return true;
  }
  return false;
}

async function requireAccess(interaction, level = ACCESS.MOD) {
  if (await hasAccess(interaction, level)) return true;
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({
      content: level === ACCESS.ADMIN
        ? '❌ Keine Berechtigung. Du musst Server-Owner, Discord-Administrator oder in der konfigurierten Admin-Rolle sein.'
        : '❌ Keine Berechtigung. Du musst Server-Owner, Discord-Administrator oder in der konfigurierten Admin-/Moderatorrolle sein.',
      ephemeral: true,
    }).catch(() => {});
  }
  return false;
}

function dashboardAccess(guild, member, settings) {
  if (!guild || !member) return false;
  if (member.user?.id === guild.ownerId || member.permissions?.has?.(PermissionFlagsBits.Administrator)) return true;
  if (settings.adminRoleId && member.roles?.cache?.has(settings.adminRoleId)) return true;
  if (settings.moderatorRoleId && member.roles?.cache?.has(settings.moderatorRoleId)) return true;
  return false;
}

module.exports = { ACCESS, hasAccess, requireAccess, dashboardAccess };
