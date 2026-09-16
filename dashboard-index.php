<?php
require __DIR__.'/dashboard-config.php';
if(empty($_SESSION['oauth_user'])){
  $state=bin2hex(random_bytes(32)); $_SESSION['oauth_state']=$state;
  $q=http_build_query(['client_id'=>DISCORD_CLIENT_ID,'redirect_uri'=>DISCORD_REDIRECT_URI,'response_type'=>'code','scope'=>'identify guilds','state'=>$state]);
  header('Location: https://discord.com/oauth2/authorize?'.$q); exit;
}
[$code,$data]=bot_api('/guilds?user_id='.rawurlencode($_SESSION['oauth_user']['id']));
$guilds=$code===200?($data['guilds']??[]):[];
?>
<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bot Dashboard</title>
<style>body{font-family:system-ui;background:#1e1f22;color:#eee;max-width:1000px;margin:40px auto;padding:20px}a,button{color:#fff;background:#5865f2;border:0;border-radius:8px;padding:10px 14px;text-decoration:none}a.card{display:block;background:#2b2d31;margin:10px 0;padding:18px}.muted{color:#aaa}</style></head>
<body><h1>🤖 Bot Dashboard</h1><p>Angemeldet als <b><?=h($_SESSION['oauth_user']['username'])?></b> · <a href="dashboard-logout.php">Logout</a></p>
<h2>Berechtigte Server</h2><?php if(!$guilds): ?><p class="muted">Kein Server gefunden, auf dem der Bot vorhanden ist und du Owner/Admin oder in der konfigurierten Admin-/Moderatorrolle bist.</p><?php endif; ?>
<?php foreach($guilds as $g): ?><a class="card" href="dashboard-server.php?id=<?=h($g['id'])?>"><b><?=h($g['name'])?></b><br><span class="muted"><?=h($g['id'])?></span></a><?php endforeach; ?>
</body></html>
