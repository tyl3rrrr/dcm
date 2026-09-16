// index.js
require('dotenv').config();
const fs=require('fs'), path=require('path'), http=require('http');
const {Client,GatewayIntentBits,Events,Collection,Options,Partials}=require('discord.js');
const config=require('./config');
const commandList=require('./commands');
const {syncCommands}=require('./command-sync');
const {OPEN_BUTTON_ID,CLOSE_BUTTON_ID,handleOpenTicket,handleCloseTicket}=require('./commands-tickets');
const legacySupport=require('./legacy-support');
const {handleAutoModCheck}=require('./automod-filter');
const spotify=require('./spotify');
const storage=require('./storage');
const {requireAccess,ACCESS}=require('./permissions');
const {handleGuildMemberAdd}=require('./commands-welcome');
const {handleMessageXp,refreshLeaderboardMessage}=require('./xp');
const {handleMention}=require('./commands-ai');
const {handleAppearanceComponent}=require('./commands-appearance');
const {applyPresence}=require('./runtime');
const {handleDashboardApi}=require('./dashboard-api');

const LOCK_FILE=path.join(__dirname,'bot.lock');
function alive(pid){try{process.kill(pid,0);return true;}catch{return false;}}
function acquireLock(){
  try{fs.writeFileSync(LOCK_FILE,String(process.pid),{flag:'wx'});return;}
  catch(e){if(e.code!=='EEXIST')throw e;}
  const pid=parseInt(fs.readFileSync(LOCK_FILE,'utf8').trim(),10);
  if(pid&&alive(pid)){console.error(`❌ Bot läuft bereits (PID ${pid}).`);process.exit(1);}
  fs.writeFileSync(LOCK_FILE,String(process.pid),'utf8');
}
function releaseLock(){try{if(fs.existsSync(LOCK_FILE))fs.unlinkSync(LOCK_FILE);}catch{}}
acquireLock(); process.on('exit',releaseLock);
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{releaseLock();process.exit(0);});

if(!process.env.DISCORD_TOKEN){console.error('DISCORD_TOKEN fehlt.');process.exit(1);}

const client=new Client({
  intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.DirectMessages],
  partials:[Partials.Channel],
  makeCache:Options.cacheWithLimits({
    MessageManager:50,ReactionManager:0,PresenceManager:0,GuildMemberManager:200,ThreadManager:25,
    GuildBanManager:0,GuildInviteManager:0,GuildScheduledEventManager:0,StageInstanceManager:0,VoiceStateManager:0,
    ApplicationCommandManager:0,AutoModerationRuleManager:0
  }),
  sweepers:{messages:{interval:1800,lifetime:900},threads:{interval:3600,lifetime:3600}}
});
client.commands=new Collection();
for(const command of commandList){
  if(command?.data&&typeof command.execute==='function'){
    if(client.commands.has(command.data.name)) console.error(`❌ Doppelte Command-Definition: ${command.data.name}`);
    client.commands.set(command.data.name,command);
  }
}
console.log(`🚀 ${client.commands.size} Commands geladen: ${[...client.commands.keys()].join(', ')}`);

client.once(Events.ClientReady,async ready=>{
  console.log(`Eingeloggt als ${ready.user.tag} auf ${ready.guilds.cache.size} Servern.`);
  applyPresence(ready);
  try{
    const result=await syncCommands(client);
    const guildOk=(result.guilds||[]).filter(x=>!x.error).length;
    const guildFailed=(result.guilds||[]).filter(x=>x.error).length;
    console.log(`✅ Slash-Commands synchronisiert: ${result.count} Commands · ${guildOk} Guild(s) erfolgreich${guildFailed?` · ${guildFailed} Guild(s) fehlgeschlagen`:''} · ${result.scope}`);
  }catch(err){console.error('❌ Slash-Command-Synchronisation fehlgeschlagen:',err.message);}
  updateServerCount();
  setInterval(updateServerCount,15*60*1000);
  refreshAllBoards();
  setInterval(refreshAllBoards,24*60*60*1000);
});

let lastPresenceCount=-1;
function updateServerCount(){
  const count=client.guilds.cache.size;
  if(count===lastPresenceCount)return;
  lastPresenceCount=count;
  // Ein Presence-Update nur bei tatsächlicher Serverzahl-Änderung.
  // Eine einzelne Streaming-Aktivität bleibt erhalten; ihr sichtbarer Name
  // ist die Serverzahl und die URL bleibt auf den konfigurierten Twitch-Account.
  const global=storage.getGuildSettings('_global').presenceSettings||{};
  client.user.setPresence({
    status: global.status || config.presence.defaultStatus,
    activities: [{
      name: global.streaming===false ? `${count} Server` : `${global.twitchName || config.presence.twitchName} · ${count} Server`,
      type: global.streaming===false ? 0 : 1,
      ...(global.streaming===false ? {} : {url: config.presence.streamUrl})
    }]
  });
}
async function refreshAllBoards(){
  for(const guild of client.guilds.cache.values()){
    const s=storage.getGuildSettings(guild.id);
    if(s.xpBoardChannelId) await refreshLeaderboardMessage(guild,s.xpBoardChannelId);
  }
}

const processed=new Set();
function once(id){if(processed.has(id))return false;processed.add(id);if(processed.size>2000)processed.delete(processed.values().next().value);return true;}

client.on(Events.InteractionCreate,async interaction=>{
  if(!once(interaction.id))return;
  try{
    if(interaction.isChatInputCommand()){
      const cmd=client.commands.get(interaction.commandName);
      if(!cmd){await interaction.reply({content:'❌ Unbekannter Befehl. Die Command-Synchronisation läuft möglicherweise noch.',ephemeral:true}).catch(()=>{});return;}
      if(cmd.requiredAccess==='superuser'){
        if(interaction.user.id!==config.superuserId){await interaction.reply({content:'❌ Keine Berechtigung.',ephemeral:true});return;}
      }else if(cmd.requiredAccess && !(await requireAccess(interaction,cmd.requiredAccess))){return;}
      await cmd.execute(interaction);
      if(interaction.guild && cmd.requiredAccess) await logBotEvent(interaction.guild,'Bot-Aktion',`/${interaction.commandName} von ${interaction.user.tag} (${interaction.user.id})`);
      return;
    }
    if(
      interaction.isButton() ||
      interaction.isStringSelectMenu() ||
      interaction.isModalSubmit()
    ){
      if(await handleAppearanceComponent(interaction)) return;
      if(interaction.isButton() && interaction.customId===OPEN_BUTTON_ID){await handleOpenTicket(interaction);return;}
      if(interaction.isButton() && interaction.customId===CLOSE_BUTTON_ID){await handleCloseTicket(interaction);return;}
    }
  }catch(err){
    console.error('Fehler bei Interaktion:',err);
    const payload={content:'❌ Beim Ausführen dieser Aktion ist ein Fehler aufgetreten.',ephemeral:true};
    if(interaction.replied||interaction.deferred) await interaction.followUp(payload).catch(()=>{}); else await interaction.reply(payload).catch(()=>{});
    logBotEvent(interaction.guild,'Fehler',err.message);
  }
});

client.on(Events.GuildMemberAdd,async member=>{
  try{await handleGuildMemberAdd(member);await logBotEvent(member.guild,'User Join',`${member.user.tag} (${member.id})`);}
  catch(err){console.error('Welcome-Fehler:',err);await logBotEvent(member.guild,'Fehler',err.message);}
});
client.on(Events.GuildMemberRemove,member=>logBotEvent(member.guild,'User Leave',`${member.user?.tag||member.id} (${member.id})`));

client.on(Events.MessageCreate,async message=>{
  try{
    if(!message.author.bot){
      const blocked=await handleAutoModCheck(message);
      if(blocked)return;
      if(message.mentions.has(client.user)) { await handleMention(message,client.user); return; }
      if(message.guild) await handleMessageXp(message);
    }
    await legacySupport.handleMessage(message);
  }catch(err){console.error('Fehler bei Nachricht:',err);await logBotEvent(message.guild,'Fehler',err.message);}
});

async function logBotEvent(guild,title,text){
  if(!guild)return;
  const s=storage.getGuildSettings(guild.id), id=s.logChannelId;
  if(!id)return;
  const ch=guild.channels.cache.get(id);
  if(ch?.isTextBased()) await ch.send(`**${title}** — ${String(text).slice(0,1800)}`).catch(()=>{});
}
client.logBotEvent=logBotEvent;

client.on(Events.Error,e=>console.error('Discord-Client-Fehler:',e.message));
process.on('unhandledRejection',e=>console.error('Unbehandelte Promise-Ablehnung:',e?.message||e));

function startHttpServers(){
  const dashboardPort=parseInt(process.env.DASHBOARD_API_PORT||'8090',10);
  const dashboardServer=http.createServer(async(req,res)=>{
    const url=new URL(req.url,`http://localhost:${dashboardPort}`);
    if(url.pathname.startsWith('/dashboard-api/')){
      try{await handleDashboardApi(req,res,url,client);}catch(err){console.error('Dashboard-API:',err.message);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'server_error'}));}
      return;
    }
    if(spotify.isConfigured() && url.pathname==='/callback'){
      const code=url.searchParams.get('code'),state=url.searchParams.get('state'),error=url.searchParams.get('error');
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
      if(error){res.end('<h1>Spotify-Verknüpfung abgebrochen.</h1>');return;}
      const discordUserId=spotify.consumeState(state);
      if(!discordUserId){res.end('<h1>Ungültiger oder abgelaufener Link.</h1>');return;}
      try{
        const tokenData=await spotify.exchangeCodeForToken(code);
        storage.setSpotifyTokens(discordUserId,{accessToken:tokenData.access_token,refreshToken:tokenData.refresh_token,expiresAt:Date.now()+tokenData.expires_in*1000});
        res.end('<h1>✅ Spotify erfolgreich verknüpft.</h1>');
      }catch(err){console.error('Spotify OAuth Fehler:',err.message);res.end('<h1>❌ Spotify-Fehler.</h1>');}
      return;
    }
    res.writeHead(404);res.end('Not found');
  });
  dashboardServer.listen(dashboardPort,()=>console.log(`🌐 Dashboard-API auf Port ${dashboardPort}`));
}
startHttpServers();

client.login(process.env.DISCORD_TOKEN);
