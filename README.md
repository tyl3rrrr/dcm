# tylxrrrr Discord Bot (v2 — flache Struktur)

**Wichtig:** Diese Version braucht **keine Unterordner mehr**. Alle Dateien
liegen direkt im Hauptordner:

```
index.js              Bot-Login, Status, Interaction-Handling
deploy-commands.js     Registriert die Commands bei Discord
commands.js             ALLE Slash-Commands in einer Datei
config.js                Links, Changelog, .env-Handling
package.json
.env
.gitignore
README.md
```

`index.js` und `deploy-commands.js` importieren beide direkt
`require('./commands')` und `require('./config')` — es gibt **keinen**
Verzeichnis-Scan (`fs.readdirSync`) mehr und **keinen** `commands/`- oder
`config/`-Ordner. Das behebt die Probleme der Vorversion, bei der
`node deploy-commands.js` je nach Umgebung nicht zuverlässig lief.

## Befehle

| Befehl            | Wirkung                                                               |
|-------------------|------------------------------------------------------------------------|
| `/antimdm`        | Postet `https://tinyurl.com/vr27mahv`                                  |
| `/web`            | Postet `Link: https://tylxrrrr.is-great.net`                          |
| `/uptime`         | Zeigt an, wie lange der Bot durchgehend läuft                         |
| `/status`         | Prüft per HTTP, ob die Website erreichbar ist (Status-Code, Antwortzeit) |
| `/changelog`      | Zeigt die letzten Einträge aus `config.js`                             |
| `/links`          | Zeigt wichtige Links (Website, Discord, GitHub, AntiMDM) als Embed     |
| `/reload`         | Lädt die `.env` neu — ohne Neustart                                    |
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
3. Privilegierte Gateway-Intents werden **nicht** benötigt.
4. Unter **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot-Permissions (mindestens):
     - `Send Messages`
     - `Embed Links`
     - `Manage Server` (**für `/automod-setup` nötig**, da das Erstellen
       von AutoMod-Regeln laut Discord-API die Berechtigung
       `MANAGE_GUILD` voraussetzt)
   - Mit der generierten URL den Bot auf deinen Server einladen.
5. Die **Application ID** (= CLIENT_ID) findest du unter
   **General Information**.

## 3. Projekt einrichten

```bash
npm install
```

Trage anschließend in `.env` deine echten Werte ein:

```
DISCORD_TOKEN=dein_echter_bot_token
CLIENT_ID=deine_echte_application_id
GUILD_ID=            # optional
OWNER_ID=            # optional, deine Discord-User-ID für /reload
WEBSITE_URL=https://tylxrrrr.is-great.net
ANTIMDM_LINK=https://tinyurl.com/vr27mahv
DISCORD_INVITE=      # optional, für /links
GITHUB_URL=          # optional, für /links
```

- **GUILD_ID** optional: gesetzt → Commands sofort auf diesem Server
  verfügbar; leer → global (bis zu 1h Verzögerung).
- **OWNER_ID** optional: nur dieser Nutzer darf `/reload` ausführen.

Änderungen am Changelog oder den Standard-Links nimmst du direkt in
`config.js` vor (oben im Array `changelog` bzw. im Objekt `links`).

## 4. Slash-Commands registrieren

```bash
npm run deploy
```

Erwartete Ausgabe (Beispiel):

```
Starte Registrierung von 9 Slash-Command(s): antimdm, web, uptime, status, changelog, links, reload, botinfo, automod-setup
Erfolgreich 9 Command(s) global registriert. Hinweis: Es kann bis zu einer Stunde dauern, bis sie überall sichtbar sind.
```

## 5. Bot starten

```bash
npm start
```

## Hinweis: `/automod-setup` und das AutoMod-Badge

`/automod-setup` legt auf dem Server, wo er ausgeführt wird, vier **echte,
funktionierende** AutoMod-Regeln an (Wortfilter, Mention-Spam-Schutz,
Spam-Erkennung, Einladungslink-Filter).

Discord vergibt das **"Uses AutoMod"-Badge** automatisch ab **100 aktiven
AutoMod-Regeln über alle Server hinweg**, auf denen der Bot Mitglied ist.
Das lässt sich nicht von einem einzelnen Server erzwingen — jeder Server,
der `/automod-setup` ausführt, trägt 4 echte Regeln bei. Mit `/botinfo`
siehst du, auf wie vielen Servern der Bot aktuell ist.

Bewusst **nicht** eingebaut: automatisiertes Massen-Anlegen leerer
Test-Server nur zum Farmen des Badges — das wäre reines Ausnutzen des
Badge-Systems statt echter Moderationsfunktion.
