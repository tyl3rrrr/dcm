// runtime.js
const { spawn } = require('child_process');
const path = require('path');
const config = require('./config');

function restartProcess() {
  return new Promise((resolve, reject) => {
    try {
      const helper = path.join(__dirname, 'restart-child.js');
      const child = spawn(process.execPath, [helper, String(process.pid), JSON.stringify(process.argv.slice(1))], {
        cwd: process.cwd(),
        env: { ...process.env, BOT_RESTART_REASON: 'discord-command' },
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      resolve(true);
      // Der Helper wartet, bis dieser Prozess beendet ist, und startet erst
      // danach den eigentlichen Node-Prozess. Dadurch kollidiert bot.lock nicht.
      setTimeout(() => process.exit(0), 150);
    } catch (err) { reject(err); }
  });
}

function applyPresence(client, override = {}) {
  const status = override.status || config.presence.defaultStatus;
  const type = override.type || 'streaming';
  const name = override.name || config.presence.activityName;
  const url = override.url || config.presence.streamUrl;
  const activities = type === 'streaming'
    ? [{ name, type: 1, url }]
    : name ? [{ name, type: 0 }] : [];
  client.user.setPresence({ status, activities });
}

module.exports = { restartProcess, applyPresence };
