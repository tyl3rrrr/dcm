# tylxrrrr Discord Bot (v5)

**Flache Struktur, keine Unterordner.** Alle Dateien liegen direkt im
Hauptordner:

```
index.js               Login, Instanz-Sperre, Presence, Command-/Button-/Nachrichten-Routing
deploy-commands.js       Registriert alle Slash-Commands bei Discord
commands.js               Fasst alle Slash-Commands zu EINEM Array zusammen
commands-core.js           /antimdm /web /uptime /status /changelog /links /reload /botinfo /help
commands-mod.js             /kick /ban /timeout /warn /clear /slowmode /lock /unlock /nickname
commands-extra.js           /ping /remindme /suggest /role /purge-user /say /coinflip /dice /8ball /membercount /roleinfo
commands-utility.js         /userinfo /serverinfo /avatar /poll
commands-settings.js        /settings
commands-tickets.js         /ticket-panel + gemeinsame Ticket-Erstellung (Button UND !support)
legacy-support.js            Text-Befehl !support (+ !support config) - kein Slash-Command
dm-notify.js                 Sendet DMs an Nutzer bei Warn/Kick/Ban/Timeout
config.js                    Links, Changelog, .env-Reload
storage.js                    Liest/schreibt data.json (Settings, Warnungen, Ticket-Zähler)
package.json / .env / .gitignore
```

## 1. Bugfix: "unendliche"/doppelte Nachrichten

**Ursache gefunden:** Auf deinen Screenshots erschienen alle Nachrichten
exakt **doppelt** (nicht wirklich unendlich) - das ist ein typisches Anzeichen
dafür, dass **der Bot-Prozess zweimal gleichzeitig lief** (z.B. weil beim
Neustart der alte `node index.js`-Prozess nicht beendet wurde). Discord
schickt Nachrichten- und Interaktions-Events an **jede** aktive Verbindung
mit demselben Token - bei zwei laufenden Prozessen wird deshalb jede Aktion
zweimal ausgeführt (doppelte DMs, doppelte Support-Anfragen).

**Fix:** `index.js` legt jetzt beim Start eine Sperrdatei `bot.lock` mit der
eigenen Prozess-ID an. Läuft bereits ein anderer, noch aktiver Prozess, wird
der Start mit einer klaren Fehlermeldung abgebrochen:

```
❌ Der Bot läuft bereits in einem anderen Prozess (PID 12345)!
Bitte beende den anderen Prozess (z.B. "kill 12345") und starte danach neu.
```

Zusätzlich hat `legacy-support.js` jetzt eine Dedupe-Absicherung (jede
Nachrichten-ID wird nur einmal verarbeitet) als zweite Sicherheitsebene.

⚠️ **Falls der Bot nach einem Absturz nicht mehr startet** mit der Meldung
"läuft bereits", aber du sicher bist, dass kein Prozess mehr läuft: einfach
die Datei `bot.lock` löschen und neu starten.

## 2. `!support` erstellt jetzt private Ticket-Kanäle (statt Spam)

Komplett überarbeitet:
- **`!support config`**: fragt nacheinander nach der zu pingenden **Rolle**
  (oder `keine`), dem **Log-Kanal** für neue Ticket-Meldungen (oder `keine`)
  und - falls noch nicht per `/settings` gesetzt - dem **Namen der
  Ticket-Kategorie**. Speichert dieselben Einstellungen wie `/settings`
  (`ticketStaffRoleId`, `logChannelId`, `ticketCategoryId`) - es gibt jetzt
  nur noch EIN Einstellungs-Set für Tickets, egal ob per `/settings` oder
  `!support config` konfiguriert.
- **`!support <Anliegen>`**: Erstellt einen **privaten Ticket-Kanal**
  (sichtbar nur für dich, die Support-Rolle und den Bot) mit einem Embed,
  das dein Anliegen enthält, plus einem **"🔒 Ticket schließen"-Button**.
  Zusätzlich geht **genau eine** Benachrichtigung in den Log-Kanal (kein
  Spam mehr). Hast du schon ein offenes Ticket, wird kein zweites erstellt.

Die Button-basierte Ticket-Erstellung (`/ticket-panel`) und `!support` nutzen
jetzt dieselbe zugrunde liegende Funktion (`createTicketChannel` in
`commands-tickets.js`) - ein einheitliches System statt zwei getrennten.

## 3. `/say` Befehl

`/say channel:#kanal nachricht:"Text"` (Berechtigung: Manage Messages) lässt
den Bot die Nachricht in dem gewählten Kanal senden.

## 4. "Create Ticket"-Button-Panel

Das gibt es bereits über `/ticket-panel` (nur Manage Guild) - postet ein
Embed mit Button **"Create Ticket"** im Kanal, in dem der Befehl ausgeführt
wird. Der resultierende Ticket-Kanal ist nur für die anfragende Person, die
eingestellte Support-Rolle und den Bot sichtbar (Rest via
`/settings ticket-category` und `/settings ticket-staff-role` einstellbar).

## 5. Mod-Aktionen senden jetzt garantiert nur 1x eine DM

Die doppelten Warn-DMs in deinem Screenshot waren ebenfalls eine Folge des
doppelten Prozesses (siehe Punkt 1) - mit der Instanz-Sperre kann das nicht
mehr passieren. `dm-notify.js` selbst hat schon immer nur einmal pro
Befehlsausführung eine DM gesendet.

## 6. Lilaner Twitch-Status

`STREAM_URL` in `.env` ist jetzt standardmäßig auf
`https://www.twitch.tv/0tylxrrrr` gesetzt (anpassbar).

## 7. Neue Befehle (jetzt insgesamt 35)

`/say /coinflip /dice /8ball /membercount /roleinfo` neu hinzugekommen -
plus die bereits vorhandenen aus den letzten Updates (`/ping /remindme
/suggest /role /purge-user /userinfo /serverinfo /avatar /poll /slowmode
/lock /unlock /nickname` usw.). Vollständige Liste über `/help`.

## 8. Einrichtung

```bash
npm install
```

`.env` ausfüllen, dann:

```bash
npm run deploy
npm start
```

### Privileged Gateway Intents (Developer Portal aktivieren)
- **MESSAGE CONTENT INTENT** - für `!support` (Bot → Privileged Gateway Intents)

### Bot kann weiterhin keine DMs empfangen, aber senden
Unverändert: kein `DirectMessages`-Intent → keine eingehenden DMs möglich.
Ausgehende DMs (Warn/Kick/Ban/Timeout-Benachrichtigungen) funktionieren
unabhängig davon weiter über `user.send(...)`.

## 9. Git-Push-Sicherheit

`.gitignore` schließt `.env`, `data.json` UND jetzt auch `bot.lock` aus -
alles host-/lauf-spezifisch, nie ins Repo.
