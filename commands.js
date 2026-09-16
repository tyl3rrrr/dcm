// commands.js - einzige Quelle für die Slash-Command-Registrierung.
const core=require('./commands-core');
const mod=require('./commands-mod');
const extra=require('./commands-extra');
const utility=require('./commands-utility');
const dev=require('./commands-dev');
const spotifyCmds=require('./commands-spotify');
const {settings}=require('./commands-settings');
const {ticketPanel}=require('./commands-tickets');
const {automodWords}=require('./commands-automod-words');
const {automodStatus}=require('./commands-automod-status');
const {welcomeSetup}=require('./commands-welcome');
const {appearence}=require('./commands-appearance');
const presence=require('./commands-presence');
const newer=require('./commands-new');

const withoutHelp=[
  ...core.simpleCommands,
  mod.kick,mod.ban,mod.timeout,mod.warn,mod.clear,mod.slowmode,mod.lock,mod.unlock,mod.nickname,
  extra.ping,extra.remindme,extra.suggest,extra.role,extra.purgeUser,extra.say,extra.coinflip,extra.dice,extra.eightball,extra.membercount,extra.roleinfo,
  utility.userinfo,utility.serverinfo,utility.avatar,utility.poll,
  dev.base64,dev.hash,dev.json,dev.timestamp,dev.uuid,dev.snowflake,dev.regexTest,
  spotifyCmds.spotifyLogin,spotifyCmds.nowplaying,spotifyCmds.play,spotifyCmds.pause,spotifyCmds.skip,spotifyCmds.search,
  settings,ticketPanel,automodWords,automodStatus,welcomeSetup,appearence,presence.status,presence.bStatNow,presence.admReload,
  newer.logChannel,newer.xpBoard,newer.xpStats,newer.xpSet,newer.globalXpBoard,
];
const help=core.buildHelpCommand(()=>allCommands);
const allCommands=[...withoutHelp,help];

// Metadata für zentrale Berechtigungsprüfung und automatische /help-Kategorien.
// User-/Info-Commands bleiben frei.
const MOD=['kick','ban','timeout','warn','clear','slowmode','lock','unlock','nickname','role','purge-user','say','automod-words','automod-status','log-channel'];
const ADMIN=['settings','ticket-panel','welcome-setup','xp-board','adm-reload','reload','appearence'];
const SUPER=['xp-set','bstatnow'];
const CATEGORIES={
  '📌 Allgemein':['antimdm','web','uptime','status','website-status','changelog','links','botinfo','ping','help','appearence'],
  '🛡️ Moderation':['kick','ban','timeout','warn','clear','slowmode','lock','unlock','nickname','role','purge-user','say','automod-words','automod-status','log-channel'],
  '👋 Welcome':['welcome-setup'],
  '🏆 XP':['xp-board','xp-stats','xp-global','xp-set'],
  '⚙️ Administration':['settings','adm-reload','bstatnow'],
  '🎫 Tickets':['ticket-panel'],
  '🧰 Sonstiges':['userinfo','serverinfo','avatar','poll','remindme','suggest','coinflip','dice','8ball','membercount','roleinfo'],
  '👨‍💻 Developer':['base64','hash','json','timestamp','uuid','snowflake','regex-test'],
  '🎧 Spotify':['spotify-login','spotify-nowplaying','spotify-play','spotify-pause','spotify-skip','spotify-search'],
};
for(const c of allCommands){
  const name=c.data.name;
  c.category=Object.keys(CATEGORIES).find(k=>CATEGORIES[k].includes(name))||'🧰 Sonstiges';
  if(MOD.includes(name)) c.requiredAccess='mod';
  if(ADMIN.includes(name)) c.requiredAccess='admin';
  if(SUPER.includes(name)) c.requiredAccess='superuser';
}
module.exports=allCommands;
module.exports.CATEGORIES=CATEGORIES;
