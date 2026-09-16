// restart-child.js - interner Helper für /adm-reload
const { spawn } = require('child_process');
const parentPid = Number(process.argv[2]);
let targetArgs = [];
try { targetArgs = JSON.parse(process.argv[3] || '[]'); } catch { process.exit(1); }
function alive(pid){try{process.kill(pid,0);return true;}catch{return false;}}
let checks=0;
const timer=setInterval(()=>{
  checks++;
  if(!alive(parentPid) || checks>100){
    clearInterval(timer);
    const child=spawn(process.execPath,targetArgs,{cwd:process.cwd(),env:process.env,detached:true,stdio:'ignore'});
    child.unref();
    process.exit(0);
  }
},100);
