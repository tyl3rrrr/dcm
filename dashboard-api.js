// dashboard-api.js
// Kleine serverseitige API für das PHP-Dashboard. Sie erhält niemals Bot- oder
// OpenAI-Secrets vom Browser. Alle Änderungen werden serverseitig erneut
// gegen Discord-Mitgliedschaft und die zentralen Rollenberechtigungen geprüft.
const crypto=require('crypto');
const storage=require('./storage');
const { dashboardAccess }=require('./permissions');
const config=require('./config');
const {applyPresence}=require('./runtime');

function auth(req){
  const expected=process.env.DASHBOARD_SHARED_SECRET||'';
  const got=req.headers['x-dashboard-secret']||'';
  return Boolean(expected && got && Buffer.byteLength(String(got))===Buffer.byteLength(String(expected)) && crypto.timingSafeEqual(Buffer.from(String(got)),Buffer.from(String(expected))));
}
async function jsonBody(req){
  let raw=''; for await(const c of req) raw+=c;
  if(raw.length>100000) throw new Error('Payload too large');
  return JSON.parse(raw||'{}');
}
function send(res,status,payload){
  const body=JSON.stringify(payload);
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(body);
}
async function getMember(guild,userId){ return guild.members.fetch(userId).catch(()=>null); }

async function handleDashboardApi(req,res,url,client){
  if(!auth(req)) return send(res,401,{error:'unauthorized'});
  const parts=url.pathname.split('/').filter(Boolean);
  // /dashboard-api/guilds
  if(req.method==='GET' && parts.length===2 && parts[1]==='guilds'){
    const userId=url.searchParams.get('user_id');
    if(!/^\d{17,20}$/.test(userId||'')) return send(res,400,{error:'invalid user_id'});
    const result=[];
    for(const guild of client.guilds.cache.values()){
      const member=await getMember(guild,userId);
      if(!member) continue;
      const settings=storage.getGuildSettings(guild.id);
      if(!dashboardAccess(guild,member,settings)) continue;
      result.push({id:guild.id,name:guild.name,icon:guild.iconURL({size:128}),settings:{
        welcomeEnabled:settings.welcomeEnabled!==false,
        welcomeRoleId:settings.welcomeRoleId||null,welcomeChannelId:settings.welcomeChannelId||null,welcomeDm:Boolean(settings.welcomeDm),
        logChannelId:settings.logChannelId||null,adminRoleId:settings.adminRoleId||null,moderatorRoleId:settings.moderatorRoleId||null,
        xpBoardChannelId:settings.xpBoardChannelId||null,presenceSettings:settings.presenceSettings||null
      }});
    }
    return send(res,200,{guilds:result});
  }

  if(req.method==='GET' && parts.length===3 && parts[1]==='guilds'){
    const guild=client.guilds.cache.get(parts[2]);
    const userId=url.searchParams.get('user_id');
    if(!guild || !/^\d{17,20}$/.test(userId||'')) return send(res,400,{error:'invalid request'});
    const member=await getMember(guild,userId), settings=storage.getGuildSettings(guild.id);
    if(!member||!dashboardAccess(guild,member,settings)) return send(res,403,{error:'forbidden'});
    return send(res,200,{channels:guild.channels.cache.filter(c=>c.isTextBased() && c.type===0).map(c=>({id:c.id,name:c.name})).sort((a,b)=>a.name.localeCompare(b.name)),
      roles:guild.roles.cache.filter(r=>r.id!==guild.id).map(r=>({id:r.id,name:r.name})).sort((a,b)=>a.name.localeCompare(b.name))});
  }

  // POST /dashboard-api/settings
  if(req.method==='POST' && parts.length===2 && parts[1]==='settings'){
    const body=await jsonBody(req);
    const guild=client.guilds.cache.get(body.guild_id);
    if(!guild) return send(res,404,{error:'bot_not_in_guild'});
    const member=await getMember(guild,body.user_id);
    const settings=storage.getGuildSettings(guild.id);
    if(!member||!dashboardAccess(guild,member,settings)) return send(res,403,{error:'forbidden'});
    const allowed=['welcomeRoleId','welcomeChannelId','welcomeDm','welcomeEnabled','logChannelId','adminRoleId','moderatorRoleId','xpBoardChannelId','presenceSettings'];
    const patch={};
    for(const key of allowed) if(Object.prototype.hasOwnProperty.call(body,key)) patch[key]=body[key];
    storage.updateGuildSettings(guild.id,patch);
    if(patch.presenceSettings){
      const ps=patch.presenceSettings;
      applyPresence(client,{status:ps.status||config.presence.defaultStatus,type:ps.streaming===false?'playing':'streaming',name:ps.twitchName||config.presence.twitchName,url:config.presence.streamUrl});
    }
    return send(res,200,{ok:true,settings:storage.getGuildSettings(guild.id)});
  }
  return send(res,404,{error:'not_found'});
}
module.exports={handleDashboardApi};
