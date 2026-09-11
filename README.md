# tylxrrrr Discord Bot (v4)

**Flache Struktur, keine Unterordner.** Alle Dateien liegen direkt im
Hauptordner:

```
index.js               Login, Presence, Command-/Button-/Nachrichten-Routing
deploy-commands.js       Registriert alle Slash-Commands bei Discord
commands.js               Fasst alle Slash-Commands zu EINEM Array zusammen
commands-core.js           /antimdm /web /uptime /status /changelog /links /reload /botinfo /help
commands-mod.js             /kick /ban /timeout /warn /clear /slowmode /lock /unlock /nickname
commands-extra.js           /ping /remindme /suggest /role /purge-user
commands-utility.js         /userinfo /serverinfo /avatar /poll
commands-settings.js        /settings
commands-tickets.js         /ticket-panel + Button-Handler (Ticket öffnen/schließen)
legacy-support.js            Text-Befehl !support (+ !support config) - kein Slash-Command
dm-notify.js                 Sendet DMs an Nutzer bei Warn/Kick/Ban/Timeout
config.js                    Links, Changelog, .env-Reload
storage.js                    Liest/schreibt data.json (Settings, Warnungen, Ticket-Zähler)
package.json / .env / .gitignore
```

Kein `fs.readdirSync`, kein Ordner-Scan - alles läuft über normale
`require()`-Importe.

## 1. AutoMod wurde komplett entfernt

`/automod-setup` hat trotz mehrerer Fixversuche nicht zuverlässig
funktioniert und wurde daher **vollständig aus dem Code entfernt** - der
Befehl existiert nirgends mehr im Projekt.

⚠️ **Wichtig:** Damit der Befehl auch bei Discord selbst verschwindet
(also wenn man `/` tippt, nicht mehr auftaucht), musst du einmal erneut
ausführen:

```bash
npm run deploy
```

Das Deploy-Skript übermittelt Discord immer die **vollständige** aktuelle
Liste der Commands (PUT-Request) - Befehle, die nicht mehr im Code stehen,
werden dabei automatisch bei Discord gelöscht. Ohne diesen Schritt bleibt
`/automod-setup` in der Discord-Oberfläche sichtbar (der Klick würde aber
sowieso nur noch "Unbekannter Befehl" liefern, da der Code dahinter fehlt).

## 2. Der lilane Status-Punkt (Fix v2)

Die Vorversion setzte zwei Aktivitäten gleichzeitig (Watching + Streaming) -
das hat bei mehreren Aktivitäten offenbar nicht zuverlässig zur lilanen
Badge geführt. Jetzt wird **nur eine einzige** Aktivität vom Typ "Streaming"
gesetzt (in `index.js`, Funktion `setPresence`).

⚠️ **Zwingende Discord-Vorgabe (nicht durch Code umgehbar):** Die `url`
muss zu **twitch.tv** oder **youtube.com** gehören und wie eine vollständige
URL aussehen (`https://www.twitch.tv/...`). Trage deinen eigenen Link in
`.env` unter `STREAM_URL` ein. Mit jeder anderen Domain bleibt der Punkt
grün - das liegt an Discord, nicht am Code.

## 3. Neue Befehle (Slash-Commands)

| Befehl | Berechtigung | Wirkung |
|---|---|---|
| `/ping` | - | Zeigt Antwortzeit/Latenz |
| `/remindme <minuten> <text>` | - | Erinnert dich per Nachricht (nur im Arbeitsspeicher, geht bei Neustart verloren) |
| `/suggest <text>` | - | Postet einen Vorschlag mit 👍/👎-Reaktionen |
| `/userinfo [user]` | - | Zeigt Infos zu einem Mitglied |
| `/serverinfo` | - | Zeigt Infos zum Server |
| `/avatar [user]` | - | Zeigt das Profilbild groß |
| `/poll <frage> <option1> <option2> ...` | - | Abstimmung mit Zahlen-Reaktionen (bis 5 Optionen) |
| `/role add\|remove <user> <rolle>` | Manage Roles | Vergibt/entfernt eine Rolle |
| `/purge-user <user> [durchsuchen]` | Manage Messages | Löscht die letzten Nachrichten eines bestimmten Nutzers |
| `/slowmode <sekunden>` | Manage Channels | Setzt den Slowmode für den Kanal |
| `/lock` / `/unlock` | Manage Channels | Sperrt/entsperrt den Kanal für @everyone |
| `/nickname <user> [name]` | Manage Nicknames | Ändert/löscht den Servernamen eines Mitglieds |

Plus die bereits vorhandenen: `/antimdm /web /uptime /status /changelog
/links /reload /botinfo /help /kick /ban /timeout /warn /clear /settings
/ticket-panel`.

## 4. `!support` - Text-Befehl (kein Slash-Command)

Bewusst als klassischer Text-Befehl umgesetzt (`legacy-support.js`):

- **`!support config`** (nur Manage-Guild-Mitglieder): Der Bot fragt per
  Nachricht nacheinander nach der **Rolle**, die gepingt werden soll
  (Rolle erwähnen, z.B. `@Support`) und dem **Kanal**, in dem Anfragen
  landen sollen (Kanal erwähnen, z.B. `#support-tickets`). Jeweils 30
  Sekunden Zeit zu antworten.
- **`!support <Anliegen>`**: Leitet die Nachricht als Embed in den
  eingestellten Kanal weiter und pingt die eingestellte Rolle.

Präfix ist über `.env` (`PREFIX=!`) änderbar.

### Nötiger zusätzlicher Schritt: MESSAGE CONTENT INTENT aktivieren

Damit der Bot den Text von Nachrichten überhaupt lesen kann, MUSS im
[Discord Developer Portal](https://discord.com/developers/applications)
unter deiner App → **Bot** → **Privileged Gateway Intents** der Schalter
**„MESSAGE CONTENT INTENT"** aktiviert werden. Ohne das ist
`message.content` immer leer und `!support` reagiert nie.

## 5. Bot kann keine DMs empfangen, aber DMs versenden

- **Empfangen:** `index.js` fordert bewusst **keinen** `DirectMessages`-
  Gateway-Intent an. Dadurch bekommt der Bot technisch gar keine Events
  für Direktnachrichten von Nutzern zugestellt - er kann sie also nicht
  verarbeiten, auch nicht versehentlich.
- **Senden:** Davon unabhängig kann der Bot weiterhin aktiv DMs
  **versenden** (`user.send(...)`, siehe `dm-notify.js`). Das nutzen
  `/warn add`, `/kick`, `/ban` und `/timeout`: Der betroffene Nutzer
  bekommt automatisch eine DM mit **Grund** und **wer die Aktion
  durchgeführt hat**. Hat der Nutzer DMs deaktiviert oder den Bot
  blockiert, schlägt das nur stillschweigend fehl (mit Hinweis in der
  Antwort) - die eigentliche Mod-Aktion läuft trotzdem durch.

## 6. Ticket-System, `/settings`

Unverändert gegenüber der letzten Version:
1. `/settings ticket-category <Kategorie>` einmalig einrichten.
2. Optional `/settings ticket-staff-role <Rolle>` und
   `/settings log-channel <Kanal>`.
3. `/ticket-panel` postet einen Button; Klick erstellt privaten Kanal mit
   „🔒 Ticket schließen"-Button darin.

## 7. Einrichtung

```bash
npm install
```

`.env` ausfüllen, dann:

```bash
npm run deploy   # WICHTIG: entfernt auch /automod-setup bei Discord
npm start
```

### Nötige Bot-Berechtigungen beim Einladen (OAuth2 URL Generator)

Scopes: `bot`, `applications.commands`

Permissions (mindestens):
- `Send Messages`, `Embed Links`, `Read Message History`, `Add Reactions`
- `Manage Messages` (`/clear`, `/purge-user`)
- `Manage Channels` (Tickets, `/slowmode`, `/lock`, `/unlock`)
- `Manage Guild` (`/settings`)
- `Manage Roles` (`/role`)
- `Manage Nicknames` (`/nickname`)
- `Kick Members`, `Ban Members`, `Moderate Members` (Mod-Befehle)

### Privileged Gateway Intents (im Developer Portal aktivieren)
- **MESSAGE CONTENT INTENT** - für `!support` (siehe Abschnitt 4)

## 8. Git-Push-Sicherheit

`.gitignore` schließt `.env` (Geheimnisse) und `data.json` (host-spezifische
Laufzeitdaten: Settings, Warnungen, Ticket-Zähler) aus. Damit lässt sich der
Code jederzeit committen/pushen, ohne Konflikte oder versehentlich
mitgeschickte Zugangsdaten.
