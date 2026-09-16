require('dotenv').config();
const {syncCommands}=require('./command-sync');
syncCommands().then(r=>{console.log(`✅ ${r.count} Slash-Commands registriert (${r.scope}).`);}).catch(e=>{console.error('❌ Registrierung fehlgeschlagen:',e);process.exit(1);});
