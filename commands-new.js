// commands-new.js
const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');
const { ACCESS, requireAccess } = require('./permissions');
const { progressForXp, refreshLeaderboardMessage, levelFromXp, applyLevelRole } = require('./xp');
const config = require('./config');

const logChannel = {
  data: new SlashCommandBuilder().setName('log-channel').setDescription('Legt den Bot-Log-Channel fest').setDMPermission(false)
    .addChannelOption(o => o.setName('channel').setDescription('Textchannel für Logs').addChannelTypes(ChannelType.GuildText).setRequired(true)),
  async execute(i) {
    if (!await requireAccess(i, ACCESS.MOD)) return;
    const ch = i.options.getChannel('channel');
    storage.setGuildSetting(i.guild.id, 'logChannelId', ch.id);
    await i.reply({content:`✅ Bot-Logs werden künftig in ${ch} geschrieben.`,ephemeral:true});
  }
};

const xpBoard = {
  data: new SlashCommandBuilder().setName('xp-board').setDescription('Konfiguriert das XP-Leaderboard').setDMPermission(false)
    .addChannelOption(o=>o.setName('channel').setDescription('Channel für das Leaderboard').addChannelTypes(ChannelType.GuildText).setRequired(true)),
  async execute(i) {
    if (!await requireAccess(i, ACCESS.ADMIN)) return;
    const ch=i.options.getChannel('channel');
    storage.updateGuildSettings(i.guild.id,{xpBoardChannelId:ch.id,xpBoardMessageId:null});
    await refreshLeaderboardMessage(i.guild,ch.id);
    await i.reply({content:`✅ XP-Leaderboard eingerichtet: ${ch}. Es wird anschließend alle 24 Stunden aktualisiert.`,ephemeral:true});
  }
};

const xpStats = {
  data:new SlashCommandBuilder().setName('xp-stats').setDescription('Zeigt XP-Statistiken')
    .addUserOption(o=>o.setName('user').setDescription('Optionaler Nutzer').setRequired(false)),
  async execute(i) {
    const user=i.options.getUser('user')||i.user;
    const row=storage.getXp(i.guild.id,user.id);
    const p=progressForXp(row.xp);
    const rank=storage.getGuildXpLeaderboard(i.guild.id).findIndex(x=>x.userId===user.id)+1;
    const globalRank=storage.getGlobalXpRank(user.id);
    const embed=new EmbedBuilder().setTitle(`📈 XP-Stats · ${user.username}`).setThumbnail(user.displayAvatarURL({size:256}))
      .setColor(0x5865f2).addFields(
        {name:'User-ID',value:user.id,inline:true},
        {name:'Username',value:user.username,inline:true},
        {name:'Server',value:i.guild.name,inline:true},
        {name:'XP',value:String(row.xp),inline:true},
        {name:'Level',value:String(row.level),inline:true},
        {name:'Server-Rang',value:rank>0?`#${rank}`:'—',inline:true},
        {name:'Globale Position',value:globalRank?`#${globalRank}`:'—',inline:true},
        {name:'Bis nächstes Level',value:String(p.needed),inline:true},
        {name:'Fortschritt',value:`${p.pct}% (${Math.max(0,row.xp-p.currentStart)}/${Math.max(1,p.next-p.currentStart)} XP)`,inline:true}
      );
    await i.reply({embeds:[embed]});
  }
};

const xpSet = {
  data:new SlashCommandBuilder().setName('xp-set').setDescription('Setzt XP und Level eines Nutzers (Superuser)')
    .addStringOption(o=>o.setName('user').setDescription('Discord User-ID').setRequired(true))
    .addIntegerOption(o=>o.setName('xp').setDescription('XP').setMinValue(0).setRequired(true))
    .addIntegerOption(o=>o.setName('level').setDescription('Level').setMinValue(0).setRequired(true))
    .addStringOption(o=>o.setName('server').setDescription('Optional: Ziel-Server-ID').setRequired(false)),
  async execute(i) {
    if(i.user.id!==config.superuserId){await i.reply({content:'❌ Nur der konfigurierte XP-Superuser darf diesen Command verwenden.',ephemeral:true});return;}
    const user=i.options.getString('user').trim();
    if(!/^\d{17,20}$/.test(user)){await i.reply({content:'❌ Ungültige Discord-User-ID.',ephemeral:true});return;}
    const xp=i.options.getInteger('xp'), requestedLevel=i.options.getInteger('level');
    const targetGuildId=i.options.getString('server')?.trim()||i.guild.id;
    if(!/^\d{17,20}$/.test(targetGuildId)){await i.reply({content:'❌ Ungültige Server-ID.',ephemeral:true});return;}
    const level=levelFromXp(xp);
    storage.setXp(targetGuildId,user,{xp,level});
    const targetGuild=i.client.guilds.cache.get(targetGuildId);
    if(targetGuild){ const member=await targetGuild.members.fetch(user).catch(()=>null); if(member) await applyLevelRole(member,level).catch(()=>{}); }
    await i.reply({content:level===requestedLevel
      ? `✅ XP-Daten für Server ${targetGuildId} gesetzt: <@${user}> · ${xp} XP · Level ${level}.`
      : `✅ XP für Server ${targetGuildId} gesetzt: ${xp}. Das Level wurde automatisch auf **${level}** korrigiert, damit XP und Level nicht widersprüchlich sind (angegeben war ${requestedLevel}).`,ephemeral:true});
  }
};

const globalXpBoard = {
  data:new SlashCommandBuilder().setName('xp-global').setDescription('Zeigt die globale XP-Rangliste'),
  async execute(i) {
    const board=storage.getGlobalXpLeaderboard().slice(0,10);
    const lines=[];
    for(let n=0;n<board.length;n++){
      const x=board[n];
      const userGuilds=storage.getUserGuildXp(x.userId);
      const best=userGuilds[0];
      const guild=best ? i.client.guilds.cache.get(best.guildId) : null;
      let serverText='Server nicht verfügbar';
      if(guild){
        let invite=null;
        const me=await guild.members.fetchMe().catch(()=>null);
        if(me?.permissions?.has(PermissionFlagsBits.CreateInstantInvite)){
          const ch=guild.channels.cache.find(c=>c.isTextBased() && c.permissionsFor(me)?.has(PermissionFlagsBits.CreateInstantInvite));
          if(ch) invite=await ch.createInvite({maxAge:86400,maxUses:1,reason:'XP Global Leaderboard'}).catch(()=>null);
        }
        serverText=invite?`[${guild.name}](${invite.url})`:guild.name;
      }
      lines.push(`**${n+1}.** <@${x.userId}> — ${x.xp} XP — ${serverText}`);
    }
    await i.reply({embeds:[new EmbedBuilder().setTitle('🌍 Globale XP-Rangliste').setDescription(lines.join('\n')||'Noch keine Daten.').setColor(0x5865f2)]});
  }
};

module.exports={logChannel,xpBoard,xpStats,xpSet,globalXpBoard};
