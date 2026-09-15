# tylxrrrr Discord Bot (v6)

## ⚠️ WICHTIGSTER SCHRITT - bitte zuerst lesen

Alle drei gemeldeten Probleme (RAM-Verbrauch, doppelte `!support`-Nachrichten,
"`/dice` unbekannt") passen zu **einer einzigen Ursache**: Es laufen
wahrscheinlich **mehrere alte Bot-Prozesse gleichzeitig** auf deinem Host -
von früheren Starts, die nie richtig beendet wurden. Ein Code-Update auf der
Festplatte ändert NICHTS an einem bereits laufenden Node-Prozess - der lädt
seinen Code nur einmal beim Start.

Das erklärt alles zusammen:
- **RAM/Freeze**: mehrere Node-Prozesse gleichzeitig = mehrfacher Speicherverbrauch
- **`!support`-Duplikate**: jeder alte Prozess verarbeitet jedes Event erneut,
  auch wenn der neue Code (mit Lock + Dedupe) das eigentlich verhindern würde
  - der Lock schützt nur NEU gestartete Prozesse, nicht bereits laufende
- **`/dice` "unbekannt"**: Discord selbst kennt den Befehl (weil `npm run
  deploy` erfolgreich war), aber der ALTE, noch laufende Prozess hat den
  Code dafür nie geladen und antwortet mit "Unbekannter Befehl"

**Bitte einmal gründlich aufräumen, bevor du weitertestest:**

```bash
# Linux/Mac - alle laufenden node-Prozesse dieses Bots anzeigen:
ps aux | grep node
# dann jeden gefundenen Prozess beenden:
kill <PID>
# im Zweifel (nur wenn ausschließlich dieser Bot auf dem Host läuft):
pkill -f "node index.js"
```

```powershell
# Windows (PowerShell/cmd):
tasklist | findstr node.exe
taskkill /F /PID <PID>
# oder (killt ALLE node.exe-Prozesse auf dem System!):
taskkill /F /IM node.exe
```

Danach zur Sicherheit `bot.lock` löschen (falls vorhanden) und **einmal
sauber neu starten**:

```bash
rm -f bot.lock      # Windows: del bot.lock
npm run deploy
npm start
```

Ab jetzt verhindert die Instanz-Sperre (siehe unten), dass das erneut
passiert.

## Was ist neu in v6

### 1. RAM-Optimierung (Ziel: stabil unter 2GB)
In `index.js`:
- **Cache-Limits** (`Options.cacheWithLimits`): Nachrichten nur 50 pro Kanal,
  Reactions/Presences/Voice-States/Invites/Bans/Scheduled-Events komplett
  deaktiviert (werden von diesem Bot nicht gebraucht), Member-Cache auf 200
  pro Server begrenzt.
- **Sweepers**: Nachrichten-Cache wird alle 30 Minuten von Einträgen älter
  als 15 Minuten befreit, Threads alle 60 Minuten.
- **Node-Heap-Limit**: `npm start` startet jetzt mit
  `node --max-old-space-size=1536` - der V8-Heap wird hart auf 1,5GB
  begrenzt, lässt also auf einem 2GB-System noch Luft für das Betriebssystem
  und andere Prozesse, statt den ganzen RAM aufzubrauchen.
- **Warn-Historie begrenzt**: `storage.js` behält pro Nutzer maximal 100
  Verwarnungen (ältere werden verworfen) - verhindert unbegrenztes Wachstum
  von `data.json` und dem RAM-Cache über Jahre.
- **Start-Banner**: Beim Start zeigt die Konsole jetzt PID, Node-Version und
  die komplette geladene Command-Liste - fehlt dort ein Befehl, weißt du
  sofort, dass ein alter Prozess noch läuft.

### 2. `!support` - Bugfix-Status
Der Code selbst (Ticket-Erstellung, genau eine Log-Nachricht, Dedupe pro
Nachrichten-ID) ist unverändert korrekt und wurde erneut mit einem
discord.js-Stub end-to-end getestet: 1 Ticket pro Anfrage, kein Duplikat bei
Zweitanfrage, keine doppelte Antwort bei doppelt zugestelltem Event. Das
verbleibende Duplikat-Problem ist mit sehr hoher Wahrscheinlichkeit der oben
beschriebene Mehrfach-Prozess - nach dem Aufräumen sollte es verschwunden
sein.

### 3. Alle Commands - Vollständigkeitsprüfung
Alle 35 Slash-Commands wurden erneut einzeln durchgeprüft: jedes Command-
Objekt hat ein gültiges `data` (inkl. `toJSON()`) und eine `execute()`-
Funktion, keine Namens-Duplikate, `/dice` ist vollständig implementiert und
korrekt in `commands.js` eingebunden (bestätigt per Test). Das
"unbekannter Befehl"-Problem war nicht im Code, siehe Abschnitt oben.

## Projektstruktur (unverändert, flach, keine Unterordner)

```
index.js               Login, Instanz-Sperre, RAM-Limits, Presence, Routing
deploy-commands.js       Registriert alle Slash-Commands bei Discord
commands.js               Fasst alle Slash-Commands zu EINEM Array zusammen
commands-core.js           /antimdm /web /uptime /status /changelog /links /reload /botinfo /help
commands-mod.js             /kick /ban /timeout /warn /clear /slowmode /lock /unlock /nickname
commands-extra.js           /ping /remindme /suggest /role /purge-user /say /coinflip /dice /8ball /membercount /roleinfo
commands-utility.js         /userinfo /serverinfo /avatar /poll
commands-settings.js        /settings
commands-tickets.js         /ticket-panel + gemeinsame Ticket-Erstellung (Button UND !support)
legacy-support.js            Text-Befehl !support (+ !support config)
dm-notify.js                 DMs bei Warn/Kick/Ban/Timeout
config.js                    Links, Changelog, .env-Reload
storage.js                    data.json (Settings, Warnungen [max. 100/Nutzer], Ticket-Zähler)
package.json / .env / .gitignore
```

## Einrichtung

```bash
npm install
npm run deploy
npm start
```

### Bei JEDER Code-Änderung künftig immer beide Schritte:
1. `npm run deploy` (aktualisiert Discords Befehlsliste)
2. Bot-Prozess **komplett neu starten** (nicht nur Dateien überschreiben!) -
   am besten mit dem Kill-Vorgehen oben, um Zombie-Prozesse zu vermeiden.

### Privileged Gateway Intents (Developer Portal)
- **MESSAGE CONTENT INTENT** aktivieren (für `!support`)

### Git-Push-Sicherheit
`.gitignore` schließt `.env`, `data.json` und `bot.lock` aus.
