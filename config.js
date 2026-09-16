const dotenv=require('dotenv');
dotenv.config();

const links={
 website:process.env.WEBSITE_URL||'https://tylxrrrr.is-great.net',
 antimdm:process.env.ANTIMDM_LINK||'https://tinyurl.com/vr27mahv',
 discordInvite:process.env.DISCORD_INVITE||'',
 github:process.env.GITHUB_URL||'',
};
const changelog=[
 {date:'2026-09-09',text:'Bot erstellt: Status-Anzeige, /antimdm, /web und /uptime hinzugefügt.'},
 {date:'2026-09-10',text:'Mega-Update: Mod-Befehle, /help, Ticket-System, AutoMod-Fix.'},
 {date:'2026-09-16',text:'Version 8.2: serverbezogene Appearance mit echtem Nickname/Role-Color-Apply und AutoMod-Reconciliation auf 10 aktive Bot-Regeln.'},
];
const presence={
 defaultStatus:process.env.BOT_STATUS||'online',
 twitchName:process.env.TWITCH_NAME||'0tylxrrrr',
 streamUrl:process.env.STREAM_URL||`https://www.twitch.tv/${process.env.TWITCH_NAME||'0tylxrrrr'}`,
 activityName:process.env.BOT_ACTIVITY_NAME||'Discord Bot',
};
const openai={model:process.env.OPENAI_MODEL||'gpt-5-mini'};
const superuserId=process.env.SUPERUSER_ID||'1324102364608598118';
function reloadEnv(){return dotenv.config({override:true});}
function reloadAll(){
 reloadEnv();
 links.website=process.env.WEBSITE_URL||links.website;
 links.antimdm=process.env.ANTIMDM_LINK||links.antimdm;
 links.discordInvite=process.env.DISCORD_INVITE||links.discordInvite;
 links.github=process.env.GITHUB_URL||links.github;
 presence.defaultStatus=process.env.BOT_STATUS||presence.defaultStatus;
 presence.twitchName=process.env.TWITCH_NAME||presence.twitchName;
 presence.streamUrl=process.env.STREAM_URL||`https://www.twitch.tv/${presence.twitchName}`;
 openai.model=process.env.OPENAI_MODEL||openai.model;
}
module.exports={links,changelog,presence,openai,superuserId,reloadEnv,reloadAll,reloadLinks:reloadAll};
