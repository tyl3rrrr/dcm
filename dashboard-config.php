<?php
// dashboard-config.php
// Keine echten Secrets hier eintragen. Auf InfinityFree als serverseitige
// Konfiguration verwenden; der Webserver liefert PHP-Quelltext nicht aus.
session_set_cookie_params([
  'httponly'=>true,'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off',
  'samesite'=>'Lax','path'=>'/'
]);
session_start();

function envv($name,$default=''){ $v=getenv($name); return $v===false ? $default : $v; }

define('DISCORD_CLIENT_ID', envv('DISCORD_CLIENT_ID','YOUR_CLIENT_ID'));
define('DISCORD_CLIENT_SECRET', envv('DISCORD_CLIENT_SECRET','YOUR_OAUTH_CLIENT_SECRET'));
define('DISCORD_REDIRECT_URI', envv('DISCORD_REDIRECT_URI','https://YOUR-DOMAIN.example/callback.php'));
define('BOT_API_URL', rtrim(envv('BOT_API_URL','https://YOUR-BOT-API.example/dashboard-api'),' /'));
define('DASHBOARD_SHARED_SECRET', envv('DASHBOARD_SHARED_SECRET','CHANGE_ME'));
define('DISCORD_API', 'https://discord.com/api/v10');

function h($s){ return htmlspecialchars((string)$s,ENT_QUOTES,'UTF-8'); }
function discord_request($url,$method='GET',$body=null,$token=null){
  $ch=curl_init($url);
  $headers=['Accept: application/json'];
  if($token) $headers[]='Authorization: Bearer '.$token;
  if($body!==null){$headers[]='Content-Type: application/x-www-form-urlencoded';curl_setopt($ch,CURLOPT_POSTFIELDS,http_build_query($body));}
  curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_TIMEOUT=>15]);
  $raw=curl_exec($ch); $code=curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
  $json=json_decode($raw?:'',true);
  return [$code,$json,$raw];
}
function bot_api($path,$method='GET',$body=null){
  $url=BOT_API_URL.$path;
  $ch=curl_init($url);
  $headers=['Accept: application/json','X-Dashboard-Secret: '.DASHBOARD_SHARED_SECRET];
  if($body!==null){$headers[]='Content-Type: application/json';curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($body));}
  curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_TIMEOUT=>15]);
  $raw=curl_exec($ch); $code=curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
  return [$code,json_decode($raw?:'',true)];
}
function csrf(){ if(empty($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(32)); return $_SESSION['csrf']; }
function require_csrf(){ if(!hash_equals($_SESSION['csrf']??'',$_POST['csrf']??'')){http_response_code(403);exit('CSRF-Prüfung fehlgeschlagen.');} }
