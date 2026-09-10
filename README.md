# tylxrrrr Discord Bot (v3 — Mega-Update)

**Flache Struktur, keine Unterordner.** Alle Dateien liegen direkt im
Hauptordner:

```
index.js               Login, Presence, Command-/Button-Routing
deploy-commands.js       Registriert alle Commands bei Discord
commands.js               Fasst alle Commands zu EINEM Array zusammen
commands-core.js           /antimdm /web /uptime /status /changelog /links /reload /botinfo /help
commands-automod.js        /automod-setup (mit Bugfix, siehe unten)
commands-mod.js            /kick /ban /timeout /warn /clear
commands-settings.js       /settings
commands-tickets.js        /ticket-panel + Button-Handler (Ticket öffnen/schließen)
config.js                  Links, Changelog, .env-Reload
storage.js                  Liest/schreibt data.json (Settings, Warnungen, Ticket-Zähler)
package.json / .env / .gitignore
```

Alles bleibt `require()`-basiert - kein `fs.readdirSync`, kein Scannen von
Ordnern.

## Git-Push-Sicherheit

`.gitignore` schließt aus:
- `.env` (Token, Client-ID — Geheimnisse)
- `data.json` (Laufzeitdaten: Server-Settings, Warnungen, Ticket-Zähler —
  entstehen automatisch beim ersten Start, sind je Server/Host
  unterschiedlich und würden bei jedem `git pull`/`push` sonst zu
  Konflikten führen)
- `node_modules/`

Damit kannst du den Code-Stand jederzeit committen/pushen, ohne dass
Zugangsdaten oder host-spezifische Laufzeitdaten mitgeschickt werden.
Beim ersten Start auf einem neuen Host legt `storage.js` `data.json`
automatisch frisch an.

## 1. Was wurde behoben: `/automod-setup`

Zwei konkrete Fehlerquellen wurden behoben:
1. **Veralteter Cache:** `guild.members.me` lieferte teilweise `null`/veraltete
   Berechtigungen, wodurch der Bot fälschlich "fehlende Berechtigung"
   meldete. Jetzt wird `guild.members.fetchMe()` genutzt (frischer
   REST-Call).
2. **Leeres `triggerMetadata`:** Die Spam-Regel schickte `triggerMetadata: {}`
   mit - Discord lehnt das bei diesem Trigger-Typ teils mit "Invalid Form
   Body" ab. Das Feld wird jetzt komplett weggelassen, wenn nicht benötigt.
3. Fehler pro Regel zeigen jetzt den genauen Discord-Fehlercode und die
   Meldung an, damit sich verbleibende Probleme sofort erkennen lassen.

Falls der Befehl bei dir weiterhin fehlschlägt: Führe ihn aus und schick mir
die genaue Fehlermeldung, die er ausgibt (Code + Text) — damit kann ich
gezielt weiter debuggen.

## 2. Der "lilane" Status-Punkt

Discord kennt für den kleinen Status-Punkt eigentlich nur vier Farben (grün
online / gelb idle / rot dnd / grau offline) — "lila" gibt es dafür nicht.
**Aber:** Wenn eine Aktivität vom Typ "Streaming" gesetzt ist, ersetzt
Discord den Punkt durch ein **lilanes Play-Symbol**. Genau das nutzt
`index.js` jetzt zusätzlich zur "Watching"-Anzeige.

⚠️ **Wichtige Einschränkung von Discord selbst:** Die Streaming-Aktivität
zeigt den lilanen Punkt nur, wenn die `url` zu **twitch.tv** oder
**youtube.com** gehört. In `.env` gibt es dafür `STREAM_URL` (Standard:
`https://twitch.tv/tylxrrrr`) — trage dort ggf. deinen eigenen Twitch/YouTube-
Link ein. Mit einer beliebigen anderen Domain (auch deiner eigenen Website)
bleibt der Punkt grün, da Discord das nicht als "echtes" Streaming
akzeptiert.

## 3. Neue Befehle

### Moderation (Standard: passende Berechtigung nötig)
| Befehl | Berechtigung | Wirkung |
|---|---|---|
| `/kick <user> [reason]` | Kick Members | Kickt ein Mitglied |
| `/ban <user> [reason] [delete_days]` | Ban Members | Bannt ein Mitglied |
| `/timeout <user> <minutes> [reason]` | Moderate Members | Timeout für X Minuten |
| `/warn add/list/clear <user>` | Moderate Members | Verwarnungen verwalten (in `data.json`) |
| `/clear <anzahl 1-100>` | Manage Messages | Löscht Nachrichten im Kanal |

### `/help`
Zeigt alle Befehle gruppiert nach Kategorie (ephemeral, nur für dich sichtbar).

### Ticket-System
1. Admin führt einmalig `/settings ticket-category <Kategorie>` aus.
2. Optional: `/settings ticket-staff-role <Rolle>` und
   `/settings log-channel <Kanal>`.
3. Admin führt `/ticket-panel` im gewünschten Kanal aus → postet ein Embed
   mit Button "🎫 Ticket erstellen".
4. Nutzer klickt den Button → privater Kanal wird unter der eingestellten
   Kategorie erstellt (nur Nutzer + Bot + optionale Support-Rolle sehen ihn).
5. Im Ticket-Kanal gibt es einen "🔒 Ticket schließen"-Button (nutzbar vom
   Ticket-Ersteller oder Support/Manage-Channels-Berechtigten) — schließt
   den Kanal nach 5 Sekunden.

### `/settings` (nur Manage Server)
- `/settings view` — zeigt aktuelle Einstellungen
- `/settings ticket-category <Kategorie>`
- `/settings ticket-staff-role <Rolle>`
- `/settings log-channel <Kanal>`

Alle Einstellungen werden pro Server in `data.json` gespeichert.

## 4. Einrichtung

```bash
npm install
```

`.env` ausfüllen (siehe Kommentare in der Datei), dann:

```bash
npm run deploy   # Slash-Commands registrieren
npm start        # Bot starten
```

### Nötige Bot-Berechtigungen beim Einladen (OAuth2 URL Generator)
Scopes: `bot`, `applications.commands`
Permissions (mindestens):
- `Send Messages`, `Embed Links`, `Read Message History`
- `Manage Messages` (für `/clear`)
- `Manage Channels` (für Ticket-Erstellung/-Schließung)
- `Manage Guild` (für `/automod-setup` und `/settings`)
- `Kick Members`, `Ban Members`, `Moderate Members` (für die Mod-Befehle)

## 5. Alle Befehle im Überblick

`antimdm, web, uptime, status, changelog, links, reload, botinfo, help,
automod-setup, kick, ban, timeout, warn, clear, settings, ticket-panel`
