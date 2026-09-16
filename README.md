# tylxrrrr Discord Bot v8.2

Diese Version erweitert die vorhandene flache CommonJS-Struktur, ohne die bestehenden Ticket-, Spotify-, Moderations-, Utility-, Developer- und lokalen Wortfilter-Funktionen absichtlich zu entfernen.

## Neu / geändert

- `/appearence` öffnet jetzt ein interaktives Discord-ähnliches Display-Name-Style-Menü mit den aktuellen Font-, Effekt- und Farboptionen aus Discords neuer Oberfläche. Eigene HEX-Farbe ist ebenfalls möglich.
- Wichtig: Discord dokumentiert diese Display-Name-Stile als Nitro-Funktion für Nutzer; eine öffentliche Bot-API zum Anwenden dieser Font-/Effekt-/Farbstyles auf einen Bot ist aktuell nicht dokumentiert. Version 8.2 speichert daher die Auswahl und zeigt sie als Vorschau, kann sie aber nicht als echten Nitro-Style auf den Bot erzwingen.
- IMG_2350/IMG_2347 wurden als UI-Referenz berücksichtigt.
- `/welcome-setup` mit `role`, `channel`, `dm`, `enabled`.
- Welcome-Member-Nummer pro Server, getrennt gespeichert.
- zentrale Berechtigungsprüfung: Owner / Discord Administrator / konfigurierte Admin-Rolle / konfigurierte Moderator-Rolle.
- `/settings admin-role` und `/settings moderator-role`.
- automatische Slash-Command-Synchronisation beim Bot-Start + `npm run deploy`.
- `/help` wird automatisch aus der registrierten Command-Liste erzeugt.
- `/adm-reload` startet einen echten neuen Node-Prozess; der Restart-Helper wartet auf das Ende des alten Prozesses, damit `bot.lock` keine Race Condition erzeugt.
- `/status` konfiguriert Bot-Presence; die frühere Website-Prüfung ist als `/website-status` erhalten.
- `/bstatnow` ist der von Discord akzeptierte lowercase-Name für den gewünschten `/bStatNow`-Command.
- Serveranzahl wird als Teil der Presence gesetzt und nur bei Änderungen neu an Discord gesendet.
- `/log-channel` + Join/Leave/Aktions-/Fehlerlogs.
- OpenAI-KI reagiert ausschließlich auf echte Bot-Mentions.
- XP pro Server + globale Aggregation, Levelkurve, Levelrollen, DMs, `/xp-stats`, `/xp-board`, `/xp-global`, `/xp-set`.
- Dashboard-API + PHP/Discord-OAuth2-Dashboard für InfinityFree.
- `/automod-status status` zählt echte Discord-AutoMod-Regeln.
- `/automod-status setup` richtet echte Discord-AutoMod-Regeln auf dem aktuellen Server ein. `/automod-status setup-all` macht dasselbe auf allen Servern und ist auf den Superuser beschränkt.
- Der lokale Wortfilter bleibt zusätzlich erhalten und wird nicht entfernt.

## Commands

60 Slash-Commands inklusive `/help`:

`/antimdm`, `/web`, `/uptime`, `/website-status`, `/status`, `/changelog`, `/links`, `/reload`, `/botinfo`, `/help`, `/ping`, `/kick`, `/ban`, `/timeout`, `/warn`, `/clear`, `/slowmode`, `/lock`, `/unlock`, `/nickname`, `/role`, `/purge-user`, `/say`, `/automod-words`, `/automod-status`, `/log-channel`, `/ticket-panel`, `/settings`, `/welcome-setup`, `/appearence`, `/bstatnow`, `/adm-reload`, `/xp-board`, `/xp-stats`, `/xp-global`, `/xp-set`, `/userinfo`, `/serverinfo`, `/avatar`, `/poll`, `/remindme`, `/suggest`, `/coinflip`, `/dice`, `/8ball`, `/membercount`, `/roleinfo`, `/base64`, `/hash`, `/json`, `/timestamp`, `/uuid`, `/snowflake`, `/regex-test`, `/spotify-login`, `/spotify-nowplaying`, `/spotify-play`, `/spotify-pause`, `/spotify-skip`, `/spotify-search`.

Außerdem bleibt `!support` erhalten.

## Datenmodell

`data.json` bleibt die vorhandene einfache Persistenz:

- `guilds[guildId]`: Welcome, Logs, Rollen, Ticket, XP-Board, Presence-Konfiguration usw.
- `warns[guildId][userId]`: Warnungen
- `spotify[userId]`: Spotify OAuth-Tokens
- `xp[guildId][userId]`: XP/Level/Messages pro Server
- `globalXp[userId]`: aggregierte XP über alle Server

XP eines Servers verändert keine `xp`-Zeile eines anderen Servers.

## XP

Level 1 beginnt bei 15 XP. Danach steigt der benötigte XP-Betrag nachvollziehbar an:

`XP für das nächste Level = 15 + (Level-1)*10 + floor((Level-1)^2*2.5)`

`/xp-set` akzeptiert XP + gewünschtes Level, korrigiert das Level aber automatisch auf das mathematisch zu den XP passende Level, damit keine widersprüchlichen Daten entstehen.

Levelrollen werden für 1, 10, 20, ..., 100 sowie 125, 150 und 200 angelegt/benutzt, soweit der Bot `Manage Roles` besitzt und seine höchste Rolle über den Levelrollen liegt.

## AutoMod-Badge

Discords offizielle Entwickler-Dokumentation nennt **100 AutoMod-Regeln über alle Server** als Voraussetzung für das Badge. Die API begrenzt pro Guild die Trigger-Typen auf 6 KEYWORD + 1 SPAM + 1 KEYWORD_PRESET + 1 MENTION_SPAM + 1 MEMBER_PROFILE = maximal 10 Regeln pro Guild. Bei genau 9 Servern liegt das theoretische Maximum damit bei 90. Der Bot kann das Badge mit nur 9 Servern daher nicht allein durch diese AutoMod-Regeln erreichen.

Version 8.2 erstellt keine sinnlosen Duplikatregeln nur für eine Badge-Zahl. `/automod-status setup` erstellt stattdessen sinnvolle offizielle Regeln.

Der bisherige `automod-filter.js` ist ein lokaler Wortfilter. Er erzeugt KEINE Discord-AutoMod-Regeln und zählt deshalb nicht für das Discord-AutoMod-Badge.

Discord dokumentiert aktuell mindestens **100 echte AutoMod-Regeln über alle Server** als Badge-Voraussetzung. Die Zahl 100/12 ist also keine Server- oder Regel-pro-Server-Rechnung. Mit `/automod-status` kann der Bot die tatsächlich abrufbaren Discord-AutoMod-Regeln live zählen.

Discord begrenzt außerdem die Anzahl bestimmter AutoMod-Trigger pro Server (z.B. 6 KEYWORD-Regeln). Deshalb sollte der Bot nicht künstlich Regeln erzeugen, nur um eine Badge-Zahl zu erreichen.

## OpenAI

`.env`:

```env
OPENAI_KEY=DEIN_OPENAI_KEY_HIER
OPENAI_MODEL=gpt-5-mini
```

Der Key wird ausschließlich serverseitig gelesen. Er wird nicht in Discord-Antworten, Dashboard-HTML oder Bot-Logs geschrieben.

Die KI reagiert nur, wenn die Bot-User-ID in der Nachricht tatsächlich erwähnt wird. Ein einfacher Rate-Limiter begrenzt Spam. HTTP 429 und andere API-Fehler werden nutzerfreundlich behandelt.

## Discord Intents

Aktivieren:

- Guilds
- Guild Members (privilegiert)
- Guild Messages
- Message Content (privilegiert)
- Direct Messages

Für den vorhandenen `!support`-Befehl und den lokalen Wortfilter ist Message Content erforderlich.

Wenn der Bot später AutoMod-Gateway-Ereignisse verarbeiten soll, können zusätzlich die AutoMod-Konfigurations-/Execution-Intents aktiviert werden; zum bloßen Zählen per REST sind sie nicht erforderlich.

## Bot-Permissions

Je nach aktivierten Funktionen:

- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Messages
- Manage Channels
- Manage Roles
- Kick Members
- Ban Members
- Moderate Members
- Manage Nicknames
- Manage Server (für Discord AutoMod REST)
- Create Instant Invite (für mögliche globale XP-Serverlinks)
- optional weitere Permissions für bestehende Ticket-/Spotify-Funktionen

`Administrator` ist nicht erforderlich, wenn die einzelnen benötigten Rechte sauber vergeben werden.

## Slash-Command-Sync

`commands.js` ist die einzige Command-Quelle.

Beim `ClientReady` wird automatisch synchronisiert. Zusätzlich:

```bash
npm run deploy
```

Mit `GUILD_ID` wird auf genau diese Guild synchronisiert. Ohne `GUILD_ID` wird global synchronisiert. Global veröffentlichte Änderungen können Discord-seitig verzögert sichtbar werden.

Wenn früher Commands im jeweils anderen Scope registriert wurden, müssen diese einmalig im alten Scope bereinigt werden; ein PUT ersetzt immer die vollständige Liste innerhalb des gewählten Scopes.

## Start

```bash
npm install
npm run deploy
npm start
```

## .env

Benötigt:

```env
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
SUPERUSER_ID=1324102364608598118
OPENAI_KEY=
OPENAI_MODEL=gpt-5-mini
DASHBOARD_API_PORT=8090
DASHBOARD_SHARED_SECRET=
TWITCH_NAME=0tylxrrrr
STREAM_URL=https://www.twitch.tv/0tylxrrrr
```

Spotify-Variablen bleiben optional.

## `/adm-reload`

Der Command startet nicht nur dotenv neu. Er erzeugt einen kleinen Node-Restart-Helper, beendet den alten Prozess und startet danach den ursprünglichen Node-Prozess erneut.

Bei Hostern mit einem eigenen Prozess-Supervisor ist ein supervisor-gesteuerter Restart weiterhin die bevorzugte Lösung. Der Command kann dort je nach Hosting durch die Supervisor-Logik ersetzt werden.

## Presence-Einschränkung

Discord-Bot-Presence ist nicht unabhängig pro Guild konfigurierbar. Eine Bot-Session kann nicht gleichzeitig für Server A „online“ und für Server B „DND“ anzeigen.

Daher speichert `/status` die gewünschte Einstellung zusätzlich pro Server, setzt aber die tatsächlich sichtbare Bot-Presence global. `/bstatnow` ändert die globale Konfiguration.

Bei Streaming und Serveranzahl wird eine einzelne Aktivität verwendet; der sichtbare Name enthält Twitch-Name + Serveranzahl und die URL zeigt auf `STREAM_URL`. Das vermeidet mehrere konkurrierende Activities.

## Dashboard

Das Dashboard besteht aus:

- `dashboard-index.php`
- `dashboard-callback.php`
- `dashboard-server.php`
- `dashboard-logout.php`
- `dashboard-config.php`

OAuth2 verwendet `identify` + `guilds`. Das Browser-Frontend bekommt weder Bot-Token noch OpenAI-Key.

Der PHP-Server ruft ausschließlich die private/geschützte Node-Dashboard-API auf. Die Node-API prüft nochmals live:

1. Bot ist in der Guild
2. User ist Mitglied
3. Owner oder Discord-Administrator oder konfigurierte Admin-/Moderatorrolle

### InfinityFree

Die kostenlose InfinityFree-Umgebung unterstützt serverseitig PHP, nicht Node.js. Das Dashboard kann daher dort als PHP-Anwendung laufen; der Discord-Bot und seine Node-Dashboard-API müssen auf einem Node-fähigen Host laufen.

Die Node-API muss über HTTPS öffentlich erreichbar sein, z.B. über eine Reverse-Proxy-URL. `DASHBOARD_SHARED_SECRET` muss auf Bot-Server und PHP-Server identisch sein.

Für das PHP-Dashboard müssen `config.php`/Server-Umgebungsvariablen gesetzt werden:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `BOT_API_URL`
- `DASHBOARD_SHARED_SECRET`

Die OAuth-Redirect-URL muss exakt im Discord Developer Portal hinterlegt sein.

## Sicherheitsmaßnahmen

- Secrets nur über Environment/serverseitige Konfiguration
- Dashboard API mit Shared Secret
- OAuth State + Session
- CSRF-Schutz für Dashboard-Änderungen
- zentrale Berechtigungsprüfung im Bot
- keine API-Keys in Logs
- `data.json`, `.env`, `bot.lock` bleiben in `.gitignore`
- OpenAI-Rate-Limit im Bot
- XP-Schreibvorgänge sind innerhalb des einzelnen Node-Prozesses synchron
- Restart-Helper wartet auf den alten Prozess, bevor `index.js` erneut gestartet wird

## Abschlussprüfung dieser Lieferung

Durchgeführt:

- `node --check` für alle JavaScript-Dateien
- `php -l` für alle PHP-Dateien
- statische Prüfung der Command-Definitionen: 59 direkte Command-Definitionen + dynamisches `/help` = 60 Slash-Commands
- Prüfung auf doppelte Command-Namen: keine gefunden
- Prüfung der zentralen Command-Liste gegen `commands.js`
- Prüfung der `.env`-Variablennamen
- Prüfung der Dashboard-OAuth-/CSRF-Struktur
- Prüfung der Restart-Lock-Reihenfolge
- Prüfung der servergetrennten XP-/Guild-Datenstruktur
- Prüfung der Levelkurve auf Level 1 = 15 XP
- Prüfung, dass `/xp-set` nicht ohne Superuser-ID ausgeführt werden kann
- Prüfung, dass Bot-Mentions die einzige KI-Triggerbedingung sind

Ein vollständiger Live-Discord-/OpenAI-Test konnte in dieser Sandbox nicht ausgeführt werden, weil die Dependency-Installation (`npm install`) hier wegen eines Netzwerk-/Zeitlimits abgebrochen ist. Die statischen Syntaxprüfungen waren erfolgreich. Vor dem produktiven Start daher einmal `npm install`, `npm run deploy` und anschließend ein Test auf einem Testserver durchführen.

## Bekannte Grenzen

- Discord-Presence ist nicht wirklich pro Guild unabhängig.
- InfinityFree Free kann den Node-Bot nicht hosten; nur das PHP-Dashboard.
- Die bisherige lokale Wortfilterung ist nicht dasselbe wie Discord AutoMod.
- Das AutoMod-Badge wird von Discord vergeben; der Bot kann nur echte Regeln zählen bzw. AutoMod über die API verwenden.
- Ein permanenter XP-Invite kann nicht garantiert werden. Das Dashboard/Leaderboard erstellt nur einen Invite, wenn der Bot im Zielserver `CREATE_INSTANT_INVITE` hat; andernfalls wird der Servername ohne Link angezeigt.
- JSON ist für einen einzelnen Bot-Prozess praktikabel, aber für sehr große XP-Lasten wäre eine echte Datenbank (SQLite/PostgreSQL/MySQL) langfristig robuster.
