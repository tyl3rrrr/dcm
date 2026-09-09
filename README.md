# tylxrrrr Discord Bot

Ein einfacher Discord-Bot mit drei Slash-Commands:

| Befehl      | Wirkung                                              |
|-------------|-------------------------------------------------------|
| `/antimdm`  | Postet `https://tinyurl.com/vr27mahv`                 |
| `/web`      | Postet `Link: https://tylxrrrr.is-great.net`          |
| `/uptime`   | Zeigt an, wie lange der Bot schon durchgehend läuft   |

Der Bot-Status wird beim Start automatisch auf
**"Watching https://tylxrrrr.is-great.net"** gesetzt.

## 1. Voraussetzungen

- Node.js ab Version 18 (empfohlen: 18, 20 oder 22)
- Ein Discord-Bot-Account im [Discord Developer Portal](https://discord.com/developers/applications)

## 2. Bot im Developer Portal anlegen

1. Neue Application erstellen.
2. Unter **Bot** → "Reset Token" → Token kopieren.
3. Unter **Bot** → "Privileged Gateway Intents": Für diesen Bot wird **keiner**
   der privilegierten Intents benötigt (er nutzt nur Slash-Commands).
4. Unter **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot-Permissions: mindestens `Send Messages`
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
WEBSITE_URL=https://tylxrrrr.is-great.net
ANTIMDM_LINK=https://tinyurl.com/vr27mahv
```

- **GUILD_ID** (Server-ID) ist optional:
  - **Gesetzt** → Commands werden nur auf diesem einen Server registriert,
    sind aber **sofort** verfügbar (ideal zum Testen).
  - **Leer** → Commands werden **global** (auf allen Servern) registriert,
    können aber bis zu ca. 1 Stunde brauchen, bis sie überall erscheinen.
  - Die Server-ID bekommst du, indem du in Discord den Entwicklermodus
    aktivierst (Einstellungen → Erweitert) und dann mit Rechtsklick auf den
    Server "ID kopieren" wählst.

## 4. Slash-Commands registrieren

Muss nur einmal (bzw. nach Änderungen an den Commands) ausgeführt werden:

```bash
npm run deploy
```

## 5. Bot starten

```bash
npm start
```

Bei Erfolg erscheint in der Konsole `Eingeloggt als <Botname>#0000`, und der
Bot ist online mit dem Status "Watching https://tylxrrrr.is-great.net".

## Dateiübersicht

- `index.js` – Hauptdatei: Login, Status, Slash-Command-Logik, Uptime-Zähler
- `deploy-commands.js` – registriert die drei Slash-Commands bei Discord
- `.env` – alle geheimen/konfigurierbaren Werte (**niemals veröffentlichen!**)
- `.gitignore` – schützt `.env` und `node_modules` vor versehentlichem Commit
- `package.json` – Abhängigkeiten (`discord.js`, `dotenv`) und Skripte
