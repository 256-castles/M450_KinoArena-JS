# M450 – LB1: Unit-Testing

**Projekt:** KinoArena (JavaScript-Portierung) – Kino-Buchungssystem
**Repository:** <https://github.com/256-castles/M450_KinoArena-JS>
**Team:** _Namen eintragen_ · **Klasse:** _eintragen_ · **Datum:** _eintragen_

---

## 1. Gewählte Software

| Kriterium | Erfüllt durch |
|---|---|
| Implementierte Geschäftslogik | Sitzplatzbuchung, Reservierungen (Seat Holds), Login-Drosselung, Validierung, Stornierung |
| Datenbank-Anbindung (kein JSON) | **MariaDB** (XAMPP) über den Query-Builder **Knex** – Tabellen `showtimes`, `auditoria`, `seats`, `bookings`, `seat_holds`, `users` … |
| Framework mit automatisierten Unit-Tests | **Vitest** (Unit-Tests, Mocking, Coverage) und **Stryker** (Mutationstests) |
| UI (optional) | React 19 (Vite) |

**Technologie:** Node.js 22, Express 5, React 19, MariaDB, Knex, Vitest 5, Stryker 10.

### Projekt starten

```bash
# Voraussetzung: XAMPP Control Panel -> MySQL starten
npm install
npm run db:create
npm run db:migrate
npm run db:migrate:test
npm run db:seed
npm run dev          # Frontend http://localhost:5173 (API dahinter auf Port 3000)
```

Demo-Login: `admin@kinoarena.test` / `password123`

---

## 2. Übersicht der Test-Suite

| Baustein | Unit (Code) | Testdatei | Tests |
|---|---|---|---|
| Teil 1 – Mocking | [`createBookings`](../server/src/services/bookingService.js) | [`bookingService.test.js`](../server/src/services/bookingService.test.js) | 16 |
| Teil 2 – Logik | [`LoginThrottle` / `throttleKey`](../server/src/domain/loginThrottle.js) | [`loginThrottle.test.js`](../server/src/domain/loginThrottle.test.js) | 35 |
| Teil 3 – Mutation | beide Units aus Teil 1 + 2 | [`stryker.lb1.config.mjs`](../stryker.lb1.config.mjs) | 90 Mutanten |
| Teil 4 – TDD | [`statsService.js`](../server/src/services/statsService.js) | [`statsService.test.js`](../server/src/services/statsService.test.js) | 18 |
| Teil 5 – Automatisierung | – | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | – |

Weitere Tests des Teams: [`bookings.test.js`](../server/src/models/bookings.test.js) (6) und
[`seatHolds.test.js`](../server/src/models/seatHolds.test.js) (5).

**Befehle:**

```bash
npm test                    # alle Unit-Tests (80 Tests, alle grün)
npm run test:coverage       # inkl. Coverage-Bericht -> coverage/index.html
npm run test:mutation:lb1   # Mutationstest Teil 3  -> reports/mutation/lb1/index.html
npm run test:lb1            # alles zusammen: Lint + Tests + Coverage + Mutationstest
```

---

## 3. Teil 1 – Unit-Test mit Mocking

### Getestete Unit

`createBookings()` in [`server/src/services/bookingService.js`](../server/src/services/bookingService.js)
bucht die gewählten Sitzplätze einer Vorstellung. Das ist die Kernfunktion des Kinos. Ablauf:

1. Transaktion öffnen und die Vorstellung mit **pessimistischem Lock** laden (`SELECT … FOR UPDATE`)
2. Fehlt die Vorstellung, wird `RecordNotFound` geworfen
3. Sitzplätze laden; gehört ein Platz nicht zum Saal, wird `RecordInvalid` geworfen
4. Ist ein Platz von einer **anderen** Person reserviert, wird `RecordInvalid` mit dem Platznamen geworfen
5. Pro Platz eine Buchung erzeugen und speichern
6. Reservierungen (Seat Holds) löschen
7. Nach der Transaktion alle Browser per Broadcast über die geänderten Plätze informieren

### Abhängigkeiten und ihre Mocks

Die Unit hat sechs externe Abhängigkeiten. Alle sind ersetzt, die echte Datenbank wird nie kontaktiert.

| Abhängigkeit | Art | Mock |
|---|---|---|
| `db.transaction`, `trx("showtimes").where().forUpdate().first()` | Datenbank (Knex) | eigener Fake-Query-Builder `createDb()` mit Spies auf Tabelle, Where-Bedingung und `forUpdate` |
| `seatsByIds` (models/seats.js) | Repository | `vi.mock` + `mockResolvedValue` |
| `activeHolds`, `deleteHoldsForSeats` (models/seatHolds.js) | Repository | `vi.mock` |
| `buildBooking`, `insertBooking` (models/bookings.js) | Repository | `vi.mock` + `mockImplementation` |
| `seatsChanged` (services/seatBroadcast.js) | externer Dienst (Server-Sent Events) | `vi.mock` |
| `seatLabel` (domain/labels.js) | Hilfsfunktion | `vi.mock` |

```js
vi.mock("../models/seats.js", () => ({ seatsByIds: vi.fn() }));
vi.mock("./seatBroadcast.js", () => ({ seatsChanged: vi.fn() }));
// ...
beforeEach(() => {
  vi.clearAllMocks();
  seatsByIds.mockResolvedValue([SEAT_A1]);
  activeHolds.mockResolvedValue([]);
});
```

Der Fake-Query-Builder filtert wie eine echte Query. Er enthält zusätzlich eine zweite Vorstellung
(`OTHER_SHOWTIME`). Fehlt die `where`-Bedingung oder ist sie falsch, wird die falsche Vorstellung geladen
und der Test schlägt fehl.

### Testfälle

| Gruppe | Testfall | Prüft |
|---|---|---|
| Vorstellung sperren | lädt die Vorstellung mit pessimistischem Lock | 1 Transaktion, Tabelle `showtimes`, `where {id}`, `forUpdate` |
| | wirft RecordNotFound | Fehlertyp und Meldung, danach keine weitere Abfrage |
| Sitzplatzprüfung | fragt die Plätze im Saal ab | Aufruf mit `trx`, `auditorium_id` und den IDs |
| | weist Plätze ab, die nicht zum Saal gehören | `RecordInvalid` mit Meldung |
| | fragt die aktiven Reservierungen ab | Aufruf mit Vorstellung und `now` |
| | eigene Reservierung blockiert nicht | Benutzer = Halter → Buchung möglich |
| | fremde Reservierung auf anderem Platz | wird ignoriert |
| | nennt nur den fremd reservierten Platz | Meldung „A2 wird gerade von einer anderen Person gebucht“ |
| | mehrere Plätze | kommagetrennt „A1, A2 …“ |
| | bucht nicht bei Konflikt | `insertBooking`, `deleteHoldsForSeats`, Broadcast nicht aufgerufen |
| Buchungen anlegen | je Platz eine Buchung | `buildBooking` + `insertBooking` pro Platz, mit `trx` |
| | ohne Zahlungsmethode | `paymentMethod` ist `null` |
| | löscht Reservierungen | `deleteHoldsForSeats(trx, 42, [IDs])` |
| | Rückgabewert | `{ showtime, seats, bookings }` |
| Broadcast | meldet die geänderten Plätze nach der Transaktion | `seatsChanged({ db, broadcaster, now }, 42, [IDs])` |
| | Reihenfolge | Broadcast erst **nach** dem Löschen der Reservierungen |

Dass diese Unit vollständig getestet ist, belegt der Mutation Score von 100 % (Teil 3).

---

## 4. Teil 2 – Unit-Test für Logik

### Getestete Unit

[`server/src/domain/loginThrottle.js`](../server/src/domain/loginThrottle.js) schützt den Login gegen
Brute-Force-Angriffe. Die Unit enthält reine Logik ohne Datenbank:

- `throttleKey(ip, email)` bildet einen normalisierten Schlüssel (Leerzeichen entfernt, Kleinschreibung)
- Die Klasse `LoginThrottle` zählt Fehlversuche pro Schlüssel:
  - nach **5 Fehlversuchen** ist der Login gesperrt (`isLockedOut`)
  - die Sperrfrist beträgt **15 Minuten**, jeder weitere Fehlversuch verlängert sie
  - abgelaufene Einträge verfallen automatisch (`failedAttempts`)
  - ab mehr als 10 000 Einträgen räumt `prune()` die abgelaufenen auf

### Testentwurf

Black-Box-Methoden:

- **Äquivalenzklassen:** unbekannter Schlüssel, unter der Grenze, an der Grenze, über der Grenze
- **Grenzwertanalyse:** 4, 5 und 6 Fehlversuche; Sperrfrist **1 ms vor** und **genau bei** Ablauf; Speichergrenze **genau 10 000** und **10 001**
- **Negativtests:** `null`, `undefined`, Leerzeichen und Grossbuchstaben in der E-Mail

White-Box: Coverage und der Mutationstest (Teil 3) zeigen, dass jeder Zweig geprüft wird.

Eine **steuerbare Uhr** (`createClock`) wird in den Konstruktor injiziert. So lassen sich Zeitgrenzen auf die
Millisekunde genau testen, ohne 15 Minuten zu warten:

```js
it("verfaellt exakt im Moment des Ablaufs", () => {
  const { throttle, clock } = createThrottle();
  throttle.registerFailure(KEY);
  clock.advance(LOCKOUT_PERIOD_MS);
  expect(throttle.failedAttempts(KEY)).toBe(0);
});
```

### Testfälle (35)

| Gruppe | Anzahl | Geprüfte Fälle und Edge Cases |
|---|---|---|
| Konstanten | 2 | 5 Versuche, 900 000 ms |
| `throttleKey` | 6 | Aufbau, Trim, Kleinschreibung, `null`, `undefined`, verschiedene IPs |
| Konstruktor | 3 | Standardwerte, Systemzeit ohne injizierte Uhr, eigene Grenzwerte |
| `failedAttempts` | 5 | unbekannt = 0, Zählung, 1 ms vor Ablauf, exakt bei Ablauf, Eintrag wird gelöscht |
| `isLockedOut` | 5 | unbekannt, unter Grenze, genau an Grenze, über Grenze, nach Ablauf |
| `registerFailure` | 5 | Rückgabewert, Ablaufzeit, Verlängerung, Neubeginn nach Ablauf, unabhängige Schlüssel |
| Speicherobergrenze | 2 | genau 10 000 → kein Aufräumen, 10 001 → Aufräumen |
| `clear` | 3 | löscht, andere Schlüssel unberührt, unbekannter Schlüssel |
| `prune` | 4 | exakt abgelaufen, 1 ms übrig, gemischt, leerer Speicher |

---

## 5. Teil 3 – Automatisierte Code-Mutation (Stryker)

### Konfiguration

[`stryker.lb1.config.mjs`](../stryker.lb1.config.mjs) mutiert **genau** die beiden Units aus Teil 1 und 2:

```js
mutate: ["server/src/domain/loginThrottle.js", "server/src/services/bookingService.js"],
htmlReporter: { fileName: "reports/mutation/lb1/index.html" },
thresholds: { high: 100, low: 100, break: 100 }   // der Lauf schlägt fehl, sobald ein Mutant überlebt
```

Ausführen mit `npm run test:mutation:lb1`. Der Bericht liegt danach unter `reports/mutation/lb1/index.html`.

### Ergebnis

| Datei | Mutanten | Killed | Timeout | Survived | No Coverage | **Score** |
|---|---|---|---|---|---|---|
| loginThrottle.js | 43 | 41 | 2 | **0** | 0 | **100 %** |
| bookingService.js | 47 | 47 | 0 | **0** | 0 | **100 %** |
| **Total** | **90** | **88** | **2** | **0** | **0** | **100 %** |

> **Timeout** zählt bei Stryker als *erkannt*. Die Mutation erzeugt eine Endlosschleife oder blockiert,
> deshalb bricht der Test ab. Bei hoher Systemlast können einzelne Mutanten als Timeout statt als Killed
> erscheinen. Der Score bleibt trotzdem 100 %.

### Welche Mutationen hat Stryker erzeugt?

Die Beispiele stammen direkt aus dem Report. Die rechte Spalte nennt den Test, der den Mutanten getötet hat.

| Mutator | Anzahl | Was wird verändert? | Beispiel (Original → Mutant) | Getötet durch Test |
|---|---|---|---|---|
| ConditionalExpression | 21 | Bedingung wird `true` oder `false` | `.filter(hold => seatIdSet.has(…) && …)` → `.filter(hold => true)` | „laesst eine eigene Reservierung die Buchung nicht blockieren“ |
| BlockStatement | 15 | Funktionsrumpf wird geleert `{}` | `function throttleKey(…) { … }` → `{}` | „setzt den Schluessel aus Praefix, IP und E-Mail zusammen“ |
| EqualityOperator | 13 | `<=` ↔ `<`, `!==` ↔ `===` | `entry.expiresAt <= this.now()` → `<` | „verfaellt exakt im Moment des Ablaufs“ |
| StringLiteral | 9 | Text wird zu `""` | `"gehoert nicht zum Saal …"` → `""` | „weist Plaetze ab, die nicht zum Saal gehoeren“ |
| ObjectLiteral | 7 | Objekt wird zu `{}` | `.where({ id: showtimeId })` → `.where({})` | „laedt die Vorstellung mit pessimistischem Lock …“ |
| ArrowFunction | 7 | Callback wird `() => undefined` | `seats.map((seat) => seat.id)` → `() => undefined` | „nennt nur den fremd reservierten Platz“ |
| MethodExpression | 5 | Methode entfernt oder ersetzt | `.trim().toLowerCase()` → `.trim().toUpperCase()` | „setzt den Schluessel aus …“ / „entfernt umschliessende Leerzeichen …“ |
| CallExpression | 4 | Aufruf entfernt | `this.prune()` → *(leer)* | „raeumt abgelaufene Eintraege beim Ueberschreiten der Obergrenze auf“ |
| ArithmeticOperator | 4 | `+` ↔ `-` | `failedAttempts(key) + 1` → `- 1` | „zaehlt registrierte Fehlversuche“ |
| LogicalOperator | 2 | `&&` ↔ `\|\|`, `??` → `&&` | `seatIdSet.has(…) && …` → `\|\| …` | „laesst eine eigene Reservierung die Buchung nicht blockieren“ |
| BooleanLiteral | 2 | Negation entfernt | `if (!showtime)` → `if (showtime)` | „laedt die Vorstellung mit pessimistischem Lock …“ |
| ArrayDeclaration | 1 | leeres Array wird befüllt | `const bookings = []` → `["Stryker was here"]` | „erzeugt je Platz eine Buchung in der Transaktion“ |

**Erkenntnis:** Die `EqualityOperator`-Mutanten (`<=` → `<`) werden nur durch die Grenzwerttests
(*exakt bei Ablauf*, *1 ms vor Ablauf*) getötet. Ohne diese Tests würden sie überleben.

Im HTML-Bericht lässt sich jede Datei öffnen. Jeder Mutant ist farbig markiert (grün = getötet), und ein Klick
zeigt die Änderung und den Test, der sie erkannt hat.

---

## 6. Teil 4 – TDD: Statistische Wertberechnung

### Anforderung

Neue Funktion: **Auslastungsstatistik über alle Vorstellungen**. Für jede Vorstellung werden aus der Datenbank
die Anzahl Buchungen und die Saalgrösse gelesen. Daraus werden berechnet:

- **Auslastung je Vorstellung** = gebuchte Plätze / Plätze im Saal (0 bis 1)
- **Durchschnitt, Median, Minimum, Maximum** und Anzahl Vorstellungen

### Red → Green → Refactor

| Phase | Vorgehen | Ergebnis |
|---|---|---|
| 🔴 **Red** | Zuerst [`statsService.test.js`](../server/src/services/statsService.test.js) geschrieben. `occupancyRate`, `summarizeOccupancy`, `occupancyStats` und `averageOccupancy` existierten noch nicht. | `npm test` schlägt fehl (*Failed to resolve import "./statsService.js"*) |
| 🟢 **Green** | Minimaler Code: `booked / total`, Durchschnitt über alle Zeilen, Knex-Abfrage mit `join` und `count`. Danach Test für Test weitere Fälle ergänzt (Median gerade/ungerade, Saal ohne Plätze, Strings vom DB-Treiber, Deckelung bei 1) und jeweils nur so viel Code geschrieben, bis der Test grün war. | 18 Tests grün |
| 🔵 **Refactor** | Aufgeteilt in **reine Logik** (`occupancyRate`, `summarizeOccupancy`) und **DB-Zugriff** (`occupancyStats`). Rundung in `round()` mit der Konstante `PRECISION` ausgelagert (verhindert Werte wie `0.30000000000000004`). Leeres Ergebnis als eingefrorene Konstante `EMPTY_STATS`. Median in eine eigene Funktion. | Tests bleiben grün |

**Red-Phase im Fachgespräch vorführen:** In [`statsService.js`](../server/src/services/statsService.js) eine
Zeile verfälschen, zum Beispiel `booked / total` → `total / booked`, und
`npx vitest run server/src/services/statsService.test.js` ausführen. Die Tests werden rot. Nach dem
Rückgängigmachen sind sie wieder grün.

### Datenbankabfrage

```js
db("showtimes")
  .join("auditoria", "auditoria.id", "showtimes.auditorium_id")
  .leftJoin("bookings", "bookings.showtime_id", "showtimes.id")
  .groupBy("showtimes.id", "auditoria.total_seats")
  .select("showtimes.id as showtime_id", "auditoria.total_seats")
  .count("bookings.id as booked_seats");
```

Der `leftJoin` sorgt dafür, dass Vorstellungen **ohne** Buchungen mit 0 % mitgezählt werden.
Im Unit-Test ist `db` gemockt, die Kette `join → leftJoin → groupBy → select → count` wird mit
`mockReturnThis()` nachgebildet.

### Edge Cases in den Tests

leere Vorstellung · ausverkauft · Saal mit 0 Plätzen (Division durch 0) · `null` als Saalgrösse ·
mehr Buchungen als Plätze (Deckelung bei 100 %) · keine Vorstellungen · gerade und ungerade Anzahl (Median) ·
Reihenfolge der Zeilen · unterschiedlich grosse Säle · Zahlen als Strings (MariaDB liefert `COUNT` als String)

### Ergebnis mit echten Daten (Seed-Datenbank)

```text
{ showtimeCount: 6, average: 0.3, median: 0.275, min: 0.05, max: 0.6 }
```

Die durchschnittliche Auslastung beträgt **30 %**, der Median 27,5 %. Die schwächste Vorstellung ist zu 5 %
belegt, die beste zu 60 %.

---

## 7. Teil 5 – Automatisierungsgrad

| Stufe | Punkte | Umsetzung |
|---|---|---|
| Manuell in der IDE | 0 | Vitest-Erweiterung in VS Code |
| Lokales Skript | 1 | `npm run test:lb1` (Lint, Tests mit Coverage, Mutationstest in einem Befehl) |
| Zeitgesteuert | 2 | GitHub Actions `schedule: cron "0 2 * * *"` – jede Nacht um 02:00 UTC |
| **Git-Push-Pipeline** | **3** | **GitHub Actions** [`ci.yml`](../.github/workflows/ci.yml) – läuft bei **jedem Push** und Pull Request |

Ablauf der Pipeline:

1. Checkout, Node 22 einrichten, `npm ci`
2. `npm run lint` – ESLint
3. `npm run test:coverage` – alle Unit-Tests mit Coverage
4. `npm run test:mutation:lb1` – Mutationstest; **bricht ab, sobald ein Mutant überlebt** (`break: 100`)
5. Coverage- und Mutationsbericht als Artefakt `test-reports` hochladen
   (herunterladbar unter *Actions → Lauf → Artifacts*)

Alle LB1-Tests arbeiten mit Mocks, deshalb braucht die Pipeline **keine Datenbank**.

---

## 8. Checkliste für das Fachgespräch

- [ ] XAMPP → MySQL starten, `npm run dev`, App im Browser zeigen
- [ ] `npm test` → 80 Tests grün
- [ ] Teil 1: `bookingService.test.js` öffnen → `vi.mock`, Fake-DB und einen Test erklären
- [ ] Teil 2: `loginThrottle.test.js` → steuerbare Uhr und Grenzwerte erklären
- [ ] Teil 3: `reports/mutation/lb1/index.html` öffnen → 100 %, Mutanten anklicken und erklären
- [ ] Teil 4: Red → Green → Refactor vorführen
- [ ] Teil 5: GitHub → *Actions* → grüner Pipeline-Lauf und Artefakt zeigen
