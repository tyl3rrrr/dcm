# Dashboard

## InfinityFree-Aufteilung

Die kostenlose InfinityFree-Umgebung ist PHP/HTTP-Hosting. Der Discord-Bot bleibt Node.js.

**InfinityFree:**
- `dashboard-index.php`
- `dashboard-callback.php`
- `dashboard-server.php`
- `dashboard-logout.php`
- `dashboard-config.php`
- statische Assets

**Node-Host/VPS:**
- Discord Bot
- Discord Gateway
- OpenAI
- `dashboard-api.js`
- `DASHBOARD_SHARED_SECRET`

Die Browser-Anwendung bekommt weder `DISCORD_TOKEN` noch `OPENAI_KEY`.

## Discord OAuth2

Im Developer Portal als Redirect URI exakt die URL von `dashboard-callback.php` hinterlegen.

Benötigte Scopes:
- `identify`
- `guilds`

Die Berechtigungsprüfung für die Bot-Verwaltung erfolgt danach noch einmal serverseitig über die Bot-API. Dadurch kann eine alte OAuth-Guildliste allein keinen Zugriff gewähren.

## Konfiguration

`dashboard-config.php` enthält ausschließlich Platzhalter. Setze serverseitig:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `BOT_API_URL`
- `DASHBOARD_SHARED_SECRET`

Wenn InfinityFree keine passenden PHP-Environment-Variablen anbietet, kann die serverseitige Konfiguration dort über eine geschützte PHP-Konfigurationsdatei erfolgen. Niemals Secrets in HTML, JavaScript im Browser oder Git einbauen.

## API

Die Node-API erwartet:

`X-Dashboard-Secret: <DASHBOARD_SHARED_SECRET>`

Endpoints:

- `GET /dashboard-api/guilds?user_id=...`
- `GET /dashboard-api/guilds/<guildId>?user_id=...`
- `POST /dashboard-api/settings`

Die API prüft Owner/Admin/Admin-Rolle/Moderator-Rolle selbst.
