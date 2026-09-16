// command-sync.js
const { REST, Routes } = require('discord.js');
const commandList = require('./commands');

function commandJson() {
  const seen = new Set();
  return commandList.filter(c => c?.data && typeof c.execute === 'function')
    .map(c => c.data.toJSON())
    .filter(c => { if(seen.has(c.name)) return false; seen.add(c.name); return true; });
}

async function syncCommands() {
  const token=process.env.DISCORD_TOKEN, clientId=process.env.CLIENT_ID;
  if(!token||!clientId) throw new Error('DISCORD_TOKEN oder CLIENT_ID fehlt.');
  const rest=new REST({version:'10'}).setToken(token);
  const body=commandJson();
  const guildId=(process.env.GUILD_ID||'').trim();
  if(guildId){
    const data=await rest.put(Routes.applicationGuildCommands(clientId,guildId),{body});
    return {scope:`Guild ${guildId}`,count:data.length,names:data.map(x=>x.name)};
  }
  const data=await rest.put(Routes.applicationCommands(clientId),{body});
  return {scope:'global',count:data.length,names:data.map(x=>x.name)};
}
module.exports={syncCommands,commandJson};
