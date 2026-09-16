<?php
require __DIR__.'/dashboard-config.php';
if(!isset($_GET['state'],$_SESSION['oauth_state']) || !hash_equals($_SESSION['oauth_state'],$_GET['state'])){http_response_code(400);exit('Ungültiger OAuth-State.');}
unset($_SESSION['oauth_state']);
if(empty($_GET['code'])) exit('OAuth wurde abgebrochen.');
[$code,$data]=discord_request(DISCORD_API.'/oauth2/token','POST',[
  'client_id'=>DISCORD_CLIENT_ID,'client_secret'=>DISCORD_CLIENT_SECRET,'grant_type'=>'authorization_code',
  'code'=>$_GET['code'],'redirect_uri'=>DISCORD_REDIRECT_URI
]);
if($code!==200 || empty($data['access_token'])){http_response_code(502);exit('Discord OAuth fehlgeschlagen.');}
[$uc,$user]=discord_request(DISCORD_API.'/users/@me','GET',null,$data['access_token']);
if($uc!==200){http_response_code(502);exit('Discord-Benutzer konnte nicht geladen werden.');}
$_SESSION['oauth_user']=$user;
session_regenerate_id(true);
header('Location: dashboard-index.php'); exit;
