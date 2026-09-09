# tylxrrrr Discord Bot

Ein Discord-Bot mit folgenden Slash-Commands:

| Befehl            | Wirkung                                                               |
|-------------------|------------------------------------------------------------------------|
| `/antimdm`        | Postet `https://tinyurl.com/vr27mahv`                                  |
| `/web`            | Postet `Link: https://tylxrrrr.is-great.net`                          |
| `/uptime`         | Zeigt an, wie lange der Bot durchgehend läuft                         |
| `/status`         | Prüft per HTTP, ob die Website erreichbar ist (Status-Code, Antwortzeit) |
| `/changelog`      | Zeigt die letzten Einträge aus `config/changelog.json`                 |
| `/links`          | Zeigt wichtige Links (Website, Discord, GitHub, AntiMDM) als Embed     |
| `/reload`         | Lädt `.env`, `links.json` und `changelog.json` neu — ohne Neustart     |
| `/botinfo`        | Version, discord.js-/Node-Version, RAM-Nutzung, Server-Anzahl          |
| `/automod-setup`  | Richtet echte AutoMod-Regeln auf dem Server ein (siehe unten)          |

Der Bot-Status wird beim Start automatisch auf
**"Watching https://tylxrrrr.is-great.net"** gesetzt.

## 1. Voraussetzungen

- Node.js ab Version 18 (empfohlen: 18, 20 oder 22)
- Ein Discord-Bot-Account im [Discord Developer Portal](https://discord.com/developers/applications)

## 2. Bot im Developer Portal anlegen

1. Neue Application erstellen.
2. Unter **Bot** → "Reset Token" → Token kopieren.
3. Privilegierte Gateway-Intents werden **nicht** benötigt (der Bot nutzt nur
   Slash-Commands und die AutoMod-REST-API).
4. Unter **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot-Permissions (mindestens):
     - `Send Messages`
     - `Embed Links`
     - `Manage Server` (**wird für `/automod-setup` benötigt**, da das
       Erstellen von AutoMod-Regeln laut Discord-API die Berechtigung
       `MANAGE_GUILD` voraussetzt)
   - Mit der generierten URL den Bot auf deinen Server einladen.
5. Die **Application ID** (= CLIENT_ID) findest du unter
   **General Information**.

## 3. Projekt einrichten

```bash
npm install
```

Trage anschließend in der Datei `.env` deine echten Werte ein:

```
DISCORD_TOKEN=dein_echter_bot_token
CLIENT_ID=deine_echte_application_id
GUILD_ID=            # optional, siehe unten
OWNER_ID=            # optional, deine Discord-User-ID für /reload
WEBSITE_URL=https://tylxrrrr.is-great.net
ANTIMDM_LINK=https://tinyurl.com/vr27mahv
```

- **GUILD_ID** (Server-ID) ist optional:
  - **Gesetzt** → Commands werden nur auf diesem einen Server registriert,
    sind aber **sofort** verfügbar (ideal zum Testen).
  - **Leer** → Commands werden **global** (auf allen Servern) registriert,
    können aber bis zu ca. 1 Stunde brauchen, bis sie überall erscheinen.
- **OWNER_ID** (optional): Deine eigene Discord-User-ID. Wenn gesetzt, darf
  **nur du** `/reload` ausführen — unabhängig von Server-Rollen, da `/reload`
  bot-globale Konfiguration ändert. Leer lassen, um `/reload` für alle mit
  Administrator-Rechten freizugeben.

Die Datei `config/links.json` erlaubt es, Website-/AntiMDM-/Discord-/
GitHub-Links **ohne Code-Änderung** zu pflegen (überschreibt die `.env`-Werte,
falls gesetzt). `config/changelog.json` ist eine einfache Liste von
`{ "date": "...", "text": "..." }`-Einträgen für `/changelog`.

## 4. Slash-Commands registrieren

Muss einmalig (bzw. nach Änderungen an den Commands) ausgeführt werden:

```bash
npm run deploy
```

## 5. Bot starten

```bash
npm start
```

## Hinweis: `/automod-setup` und das AutoMod-Badge

`/automod-setup` legt auf dem Server, wo er ausgeführt wird, vier **echte,
funktionierende** AutoMod-Regeln an:

1. Filter für anstößige Inhalte (Discords Wort-Presets: Schimpfwörter,
   sexuelle Inhalte, beleidigende Begriffe)
2. Schutz gegen Mention-Spam
3. Discords eingebaute Spam-Erkennung
4. Filter gegen fremde Server-Einladungslinks (`discord.gg/...` etc.)

Discord vergibt das **"Uses AutoMod"-Badge** automatisch, sobald eine
App/ein Bot **insgesamt mindestens 100 aktive AutoMod-Regeln über alle
Server hinweg** hat, auf denen sie/er Mitglied ist (offizielle Discord-Quelle:
"Introducing the AutoMod Badge"). Das lässt sich **nicht** von einem
einzelnen Server aus erzwingen — jeder Server, der `/automod-setup`
ausführt, trägt 4 echte Regeln bei. Mit **25 Servern** wäre die
100er-Marke rein rechnerisch erreicht. Mit `/botinfo` siehst du, auf wie
vielen Servern der Bot aktuell ist.

Bewusst **nicht** eingebaut wurde eine automatisierte "Farm"-Logik (z.B.
massenhaftes Erstellen leerer Test-Server nur zum Anlegen von Regeln ohne
echten Zweck) — das wäre reines Ausnutzen des Badge-Systems statt echter
Moderationsfunktion. `/automod-setup` liefert stattdessen auf jedem Server,
auf dem der Bot tatsächlich genutzt wird, echten Mehrwert.

## Dateiübersicht

```
index.js                 Hauptdatei: Login, Presence, Command-Loading
deploy-commands.js        Registriert alle Commands aus commands/ bei Discord
lib/config.js             Lädt & reloadet .env, links.json, changelog.json
commands/
  antimdm.js
  web.js
  uptime.js
  status.js               HTTP-Check der Website
  changelog.js
  links.js
  reload.js               Nur Owner (falls OWNER_ID gesetzt) / Administrator
  botinfo.js
  automod-setup.js         Nur Nutzer mit "Server verwalten"
config/
  links.json               Editierbare Links
  changelog.json            Editierbare Changelog-Einträge
.env                        Geheime/konfigurierbare Werte (NIEMALS veröffentlichen!)
.gitignore                  Schützt .env und node_modules
package.json                Abhängigkeiten & Skripte
```
