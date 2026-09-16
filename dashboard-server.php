<?php
require __DIR__.'/dashboard-config.php';
if(empty($_SESSION['oauth_user'])){header('Location:dashboard-index.php');exit;}
$id=$_GET['id']??'';
if(!preg_match('/^\d{17,20}$/',$id)){http_response_code(400);exit('Ungültiger Server.');}
[$code,$data]=bot_api('/guilds/'.rawurlencode($id).'?user_id='.rawurlencode($_SESSION['oauth_user']['id']));
if($code!==200){http_response_code($code);exit('Server nicht verfügbar oder keine Berechtigung.');}
$g=$data; $s=$g['settings']??[];
if($_SERVER['REQUEST_METHOD']==='POST'){
 require_csrf();
 $body=['guild_id'=>$id,'user_id'=>$_SESSION['oauth_user']['id']];
 foreach(['welcomeEnabled','welcomeDm','welcomeRoleId','welcomeChannelId','logChannelId','adminRoleId','moderatorRoleId','xpBoardChannelId'] as $k) if(array_key_exists($k,$_POST)) $body[$k]=in_array($k,['welcomeEnabled','welcomeDm'])?($_POST[$k]==='1'):($_POST[$k]===''?null:$_POST[$k]);
 if(isset($_POST['presenceStatus'])) $body['presenceSettings']=['status'=>$_POST['presenceStatus'],'twitchName'=>trim($_POST['twitchName']??'0tylxrrrr'),'streaming'=>($_POST['presenceStreaming']??'1')==='1'];
 [$pc,$pd]=bot_api('/settings','POST',$body);
 if($pc!==200){$error='Speichern fehlgeschlagen.';} else {$s=$pd['settings']??$s;$saved=true;}
}
?>
<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=h($g['name'])?></title>
<style>body{font-family:system-ui;background:#1e1f22;color:#eee;max-width:850px;margin:30px auto;padding:20px}label{display:block;margin:14px 0}input,select{width:100%;padding:9px;background:#2b2d31;color:#fff;border:1px solid #555;border-radius:6px}button,a{margin-top:16px;padding:10px 14px;border:0;border-radius:7px;background:#5865f2;color:#fff;text-decoration:none}section{background:#2b2d31;padding:20px;margin:15px 0;border-radius:12px}.ok{color:#57f287}.err{color:#ed4245}</style></head>
<body><a href="dashboard-index.php">← Serverliste</a><h1><?=h($g['name'])?></h1><?php if(!empty($saved)):?><p class="ok">Gespeichert.</p><?php endif;?><?php if(!empty($error)):?><p class="err"><?=h($error)?></p><?php endif;?>
<form method="post"><input type="hidden" name="csrf" value="<?=h(csrf())?>">
<section><h2>Welcome</h2>
<label>Aktiv <select name="welcomeEnabled"><option value="1" <?=($s['welcomeEnabled']??true)?'selected':''?>>Ja</option><option value="0" <?=isset($s['welcomeEnabled'])&&!$s['welcomeEnabled']?'selected':''?>>Nein</option></select></label>
<label>DM <select name="welcomeDm"><option value="1" <?=!empty($s['welcomeDm'])?'selected':''?>>Ja</option><option value="0" <?=empty($s['welcomeDm'])?'selected':''?>>Nein</option></select></label>
<label>Welcome-Rollen-ID<input name="welcomeRoleId" value="<?=h($s['welcomeRoleId']??'')?>"></label>
<label>Welcome-Channel-ID<input name="welcomeChannelId" value="<?=h($s['welcomeChannelId']??'')?>"></label></section>
<section><h2>Logs & Rollen</h2>
<label>Log-Channel-ID<input name="logChannelId" value="<?=h($s['logChannelId']??'')?>"></label>
<label>Admin-Rollen-ID<input name="adminRoleId" value="<?=h($s['adminRoleId']??'')?>"></label>
<label>Moderator-Rollen-ID<input name="moderatorRoleId" value="<?=h($s['moderatorRoleId']??'')?>"></label></section>
<section><h2>Presence / Status</h2>
<label>Status <select name="presenceStatus"><option value="online">Online</option><option value="idle">Idle / AFK</option><option value="dnd">DND</option><option value="invisible">Invisible</option></select></label>
<label>Twitch-Name<input name="twitchName" value="<?=h(($s['presenceSettings']['twitchName']??'0tylxrrrr'))?>"></label>
<label>Streaming <select name="presenceStreaming"><option value="1" <?=($s['presenceSettings']['streaming']??true)?'selected':''?>>Ja</option><option value="0" <?=isset($s['presenceSettings']['streaming'])&&!$s['presenceSettings']['streaming']?'selected':''?>>Nein</option></select></label>
</section>
<section><h2>XP</h2><label>XP-Board-Channel-ID<input name="xpBoardChannelId" value="<?=h($s['xpBoardChannelId']??'')?>"></label></section>
<button type="submit">Einstellungen speichern</button></form></body></html>
