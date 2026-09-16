// xp.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');

const LEVEL_MILESTONES = [1,10,20,30,40,50,60,70,80,90,100,125,150,200];
const XP_PER_LEVEL = (level) => 15 + ((level - 1) * 10) + Math.floor((level - 1) * (level - 1) * 2.5);

function xpForLevel(level) {
  if (level <= 0) return 0;
  let total = 0;
  for (let i = 1; i <= level; i++) total += XP_PER_LEVEL(i);
  return total;
}
function levelFromXp(xp) {
  let level = 0;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}
function progressForXp(xp) {
  const level = levelFromXp(xp);
  const currentStart = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const needed = Math.max(0, next - xp);
  const pct = next === currentStart ? 100 : Math.floor(((xp - currentStart) / (next - currentStart)) * 100);
  return { level, currentStart, next, needed, pct: Math.max(0, Math.min(100, pct)) };
}

async function ensureLevelRoles(guild) {
  const me = await guild.members.fetchMe();
  const roles = [];
  for (const level of LEVEL_MILESTONES) {
    const name = `Level ${level}`;
    let role = guild.roles.cache.find(r => r.name === name);
    if (!role) {
      if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) continue;
      role = await guild.roles.create({ name, reason: 'XP-Level-Rolle automatisch erstellt' }).catch(() => null);
    }
    if (role) roles.push({ level, role });
  }
  return roles;
}

async function applyLevelRole(member, newLevel) {
  const roles = await ensureLevelRoles(member.guild);
  const reached = roles.filter(x => newLevel >= x.level);
  if (!reached.length) return null;
  const highest = reached[reached.length - 1];
  const me = await member.guild.members.fetchMe();
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) return null;
  if (highest.role.position >= me.roles.highest.position) return null;
  for (const item of roles) {
    if (item.role.position >= me.roles.highest.position) continue;
    if (item.level <= newLevel) await member.roles.add(item.role).catch(() => {});
    else await member.roles.remove(item.role).catch(() => {});
  }
  return highest.role;
}

async function handleMessageXp(message) {
  if (!message.guild || message.author.bot) return;
  const amount = 5 + Math.floor(Math.random() * 6);
  const before = storage.getXp(message.guild.id, message.author.id);
  const oldLevel = levelFromXp(before.xp);
  const nextXp = before.xp + amount;
  const newLevel = levelFromXp(nextXp);
  const row = storage.addXp(message.guild.id, message.author.id, amount, newLevel);
  if (newLevel > oldLevel) {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (member) {
      const role = await applyLevelRole(member, newLevel);
      await member.send({
        embeds: [new EmbedBuilder()
          .setTitle('🎉 Neues Level erreicht!')
          .setDescription(`Du bist auf **Level ${newLevel}** gestiegen.`)
          .addFields(
            { name: 'XP', value: String(row.xp), inline: true },
            { name: 'Level-Rolle', value: role ? role.toString() : 'Keine Rolle verfügbar', inline: true }
          )
          .setColor(0x5865f2)]
      }).catch(() => {});
    }
  }
  return row;
}

async function refreshLeaderboardMessage(guild, channelId) {
  const settings = storage.getGuildSettings(guild.id);
  const channel = guild.channels.cache.get(channelId || settings.xpBoardChannelId);
  if (!channel || !channel.isTextBased()) return false;
  const board = storage.getGuildXpLeaderboard(guild.id).slice(0, 10);
  const desc = board.length
    ? board.map((x,i) => `**${i+1}.** <@${x.userId}> — Level ${x.level} · ${x.xp} XP`).join('\n')
    : 'Noch keine XP-Daten.';
  const embed = new EmbedBuilder().setTitle(`🏆 XP-Leaderboard · ${guild.name}`).setDescription(desc).setColor(0x5865f2)
    .setFooter({ text: 'Automatische Aktualisierung alle 24 Stunden' }).setTimestamp();
  if (settings.xpBoardMessageId) {
    const old = await channel.messages.fetch(settings.xpBoardMessageId).catch(() => null);
    if (old) { await old.edit({ embeds: [embed] }).catch(() => {}); return true; }
  }
  const msg = await channel.send({ embeds: [embed] }).catch(() => null);
  if (msg) storage.setGuildSetting(guild.id, 'xpBoardMessageId', msg.id);
  return Boolean(msg);
}

module.exports = { LEVEL_MILESTONES, xpForLevel, levelFromXp, progressForXp, handleMessageXp, refreshLeaderboardMessage };
