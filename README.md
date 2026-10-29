# KinoArena – JavaScript-Portierung 🎬🎟️

JavaScript-Version von **KinoArena** (Original: Ruby on Rails 8, [maralein03/KinoArena](https://github.com/maralein03/KinoArena),
Modul 223). Funktionsumfang, Texte und Design entsprechen dem Original; die Applikation dient als
Testobjekt für **Modul 450 – Applikationen testen** (Unit- und Mutationstests mit Vitest und Stryker).

| Bereich | Original (Rails) | Diese Version |
|---|---|---|
| Backend | Rails 8, Controller + Pundit | Node.js 22+, Express 5, JSON-API unter `/api` |
| Frontend | ERB, Tailwind 4, Hotwire (Turbo + Stimulus) | React 19 (Vite), Tailwind 4, React Router |
| Echtzeit | Turbo Streams über ActionCable | Server-Sent Events (`EventSource`) |
| Datenbank | SQLite3, ActiveRecord | **MariaDB** (z. B. XAMPP), Knex |
| Passwörter | bcrypt (`has_secure_password`) | bcryptjs |
| QR-Codes | rqrcode | qrcode |
| Tests | Minitest, Capybara | Vitest, Testing Library, Supertest, Stryker |

---

## 🎯 Funktionsumfang

**Kunde:** Konto erstellen, anmelden, abmelden · Passwort über zeitlich begrenzten Link zurücksetzen ·
Programm und Spielzeiten ansehen · Sitzplätze im Saalplan wählen (5 Minuten reserviert, live für alle
sichtbar) · simulierter Checkout (Apple Pay / Kreditkarte / TWINT) · Tickets mit QR-Code · Stornieren
künftiger Vorstellungen · Profil bearbeiten.

**Administrator:** zusätzlich Filme, Säle und Vorstellungen verwalten · Benutzer und Rollen verwalten ·
Aktivitätsprotokoll einsehen und filtern.

---

## 🚀 Installation & lokaler Start

**Voraussetzungen:** Node.js 22 oder neuer, MariaDB 10.4 oder neuer. Am einfachsten über
[XAMPP](https://www.apachefriends.org/) – es bringt MariaDB und phpMyAdmin mit. Docker wird nicht benötigt.

**1. MariaDB starten:** XAMPP Control Panel öffnen und bei Modulen **MySQL** udn **Apache** auf *Start* klicken.

**2. Abhängigkeiten installieren und Konfiguration anlegen**

```bash
npm install
cp .env.example .env      # Windows (PowerShell): Copy-Item .env.example .env
```

Die Vorgaben in `.env` passen zu einer frischen XAMPP-Installation (Benutzer `root` ohne Passwort).
Mit eigenem Datenbankbenutzer `DB_USER` und `DB_PASSWORD` anpassen.

**3. Datenbanken anlegen, migrieren und Testdaten laden**

```bash
npm run db:create         # legt kinoarena_development und kinoarena_test an
npm run db:migrate
npm run db:migrate:test   # Schema der Testdatenbank
npm run db:seed
```

Alternativ zu `db:create` lässt sich `server/src/db/create-databases.sql` in phpMyAdmin
(<http://localhost/phpmyadmin>) ausführen.

**4. Entwicklungsserver starten**

```bash
npm run dev
```

Startet die API auf <http://localhost:3000> und das Frontend auf **<http://localhost:5173>**
(Vite leitet `/api` an Express weiter).

> **E-Mails in der Entwicklung:** Es ist kein SMTP-Server nötig. Mails landen unter `tmp/mails/` –
> als `.eml` (zum Öffnen im Mailprogramm) und als `.txt`, in der der Passwort-Reset-Link im Klartext steht.

### Produktionsmodus

```bash
npm run build                      # baut das Frontend nach client/dist
NODE_ENV=production SESSION_SECRET=… TOKEN_SECRET=… npm start
```

Express liefert dann API und Frontend gemeinsam auf Port 3000 aus. Läuft die App hinter HTTPS,
`APP_URL` auf die `https://…`-Adresse setzen – dann wird das Session-Cookie als `Secure` markiert
(hinter einem Reverse Proxy zusätzlich `TRUST_PROXY=1`).

### Alle Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | API (mit Neustart bei Änderungen) + Vite-Dev-Server |
| `npm run build` / `npm start` | Frontend bauen / Server starten |
| `npm run db:create` | Datenbanken anlegen |
| `npm run db:migrate` / `db:migrate:test` | Migrationen für Entwicklung / Test |
| `npm run db:seed` | Demodaten laden (beliebig oft ausführbar) |
| `npm run db:reset` | alles zurückrollen, neu migrieren, Demodaten laden |
| `npm test` / `test:watch` / `test:coverage` | Vitest |
| `npm run test:mutation` | Stryker-Mutationstests |
| `npm run lint` | ESLint |
| `npm run benchmark:showtimes` | Lasttest NFA-3 (Server muss laufen) |

---

## 🔑 Demo-Zugangsdaten (nach `db:seed`)

| Rolle | E-Mail | Passwort |
|---|---|---|
| Administrator | `admin@kinoarena.test` | `password123` |
| Kundin A | `anna@example.com` | `annaanna` |
| Kunde B | `ben@example.com` | `benbenben` |

Die beiden Kundenkonten dienen dazu, Reservierung und Doppelbuchungssperre in zwei getrennten
Browser-Sitzungen vorzuführen (z. B. normales und privates Fenster). Das Sammelkonto **Abendkasse**
(`abendkasse@kinoarena.test`) besitzt die vorbelegten Plätze und ist nicht für die Anmeldung gedacht.

---

## 🏗️ Architektur

```
server/src/
├─ app.js            createApp({ db, config, mailer, clock, … }) – baut die Express-App
├─ server.js         Startpunkt (Datenbank, Mailer, Port)
├─ domain/           reine Logik ohne Datenbank: Validierung, Labels, Tokens, Drosselung, Zeit
├─ models/           Datenzugriff + Validierung je Tabelle (entspricht app/models)
├─ policies/         Berechtigungen, deny by default (entspricht app/policies, Pundit)
├─ services/         Buchung, Reservierungen, Live-Updates (SSE), Mailer, QR-Code
├─ middleware/       Session/aktueller Benutzer, Zugriffsschutz, Fehlerbehandlung
├─ routes/           ein Router je Rails-Controller (entspricht app/controllers)
└─ db/               Knex-Konfiguration, Migrationen, Seeds
client/src/
├─ pages/            eine Seite je Rails-View (entspricht app/views)
├─ components/       Navigation, Flash-Meldungen, Saalplan, Formular-Fehler, Guards
├─ context/          angemeldeter Benutzer, Flash-Meldungen
├─ hooks/            Daten laden, Fehlerbehandlung, Live-Updates, Countdown
└─ lib/              reine Hilfsfunktionen: Formatierung, Saalplan-Zustand
```

| Rails | JavaScript |
|---|---|
| `app/models/*.rb` | `server/src/models/*.js` + `server/src/domain/*` |
| `app/policies/*_policy.rb` | `server/src/policies/*Policy.js` |
| `app/controllers/**` | `server/src/routes/**` |
| `app/views/**` | `client/src/pages/**`, `client/src/components/**` |
| `seat_map_controller.js` / `checkout_controller.js` (Stimulus) | `components/SeatMap.jsx` + `lib/seatMapState.js`, `pages/Checkout.jsx` |
| `SeatBroadcast` (Turbo Streams) | `services/seatBroadcast.js` + `GET /api/showtimes/:id/seats/stream` |
| `generates_token_for :password_reset` | `domain/passwordResetToken.js` (HMAC-SHA256) |
| `FAILED_LOGINS` (MemoryStore) | `domain/loginThrottle.js` |
| `UserMailer` | `services/mailer.js` (nodemailer) |
| `db/migrate`, `db/seeds.rb` | `server/src/db/migrations`, `server/src/db/seeds` |
| `lib/tasks/benchmark.rake` | `scripts/benchmark-showtimes.js` |

### API (Auszug)

| Bereich | Endpunkte |
|---|---|
| Sitzung | `GET/POST/DELETE /api/session`, `POST /api/registrations` |
| Passwort-Reset | `POST /api/password_resets`, `GET/PATCH /api/password_resets/:token` |
| Programm | `GET /api/showtimes`, `GET /api/showtimes/:id`, `GET /api/showtimes/:id/seats/stream` (SSE), `GET /api/movies/:id` |
| Buchen | `POST/DELETE /api/showtimes/:id/seat_holds[/:seatId]`, `GET /api/showtimes/:id/checkout?seat_ids=…`, `GET/POST /api/bookings`, `GET/DELETE /api/bookings/:id` |
| Benutzer | `GET /api/users`, `GET/PATCH/DELETE /api/users/:id` |
| Admin | `/api/admin/movies`, `/api/admin/auditoria`, `/api/admin/showtimes` (CRUD), `GET /api/admin/activity_logs` |

Antworten enthalten wie die Flash-Meldungen im Original `notice` bzw. `alert`. Validierungsfehler
kommen als **422** mit `{ errors: { feld: [...] }, messages: [...] }`.

---

## 🔒 Concurrency und Datenintegrität

Die vier Stufen des Originals sind übernommen – auf MariaDB greifen jetzt alle tatsächlich.

**Stufe 1 – Unique-Index gegen Doppelbuchungen.** `bookings` hat einen Unique-Index auf
`[showtime_id, seat_id]`. Eine Verletzung (`ER_DUP_ENTRY`) wird zu `RecordNotUnique` und im
Router abgefangen (`routes/bookings.js`): HTTP 409 und Eintrag `booking_conflict` im Protokoll.

**Stufe 2 – Optimistic Locking.** `movies` und `showtimes` haben eine Spalte `lock_version`; die
Formulare senden sie mit (`models/locking.js`):

```js
const updated = await db(table)
  .where({ id, lock_version: lockVersion })
  .update({ ...changes, lock_version: db.raw("lock_version + 1") });
if (updated === 0) throw new StaleObjectError(table, id);   // -> HTTP 409
```

**Stufe 3 – Temporäre Reservierung mit Echtzeit-Anzeige.** Ein Klick auf einen Platz reserviert ihn
für 5 Minuten (`seat_holds`, ebenfalls mit Unique-Index). Jede Änderung wird per Server-Sent Events an
alle Zuschauer der Vorstellung verteilt; bei Ben wird Annas Platz sofort goldgelb und gesperrt.
Auch wer die Oberfläche umgeht, wird serverseitig gestoppt (`services/bookingService.js`).

**Stufe 4 – Pessimistic Locking beim Buchen.** Prüfen und Schreiben laufen in einer Transaktion, die
die Vorstellung mit `SELECT … FOR UPDATE` sperrt:

```js
await db.transaction(async (trx) => {
  const showtime = await trx("showtimes").where({ id: showtimeId }).forUpdate().first();
  // Sitzplätze prüfen, Buchungen schreiben, Reservierungen entfernen
});
```

Im Original verwarf SQLite die Sperre; auf MariaDB wartet eine parallele Buchung tatsächlich.
Gemessen: fünf gleichzeitige Buchungen desselben Platzes ergeben genau eine Buchung, die anderen
vier erhalten „Sitzplatz ist für diese Vorstellung bereits gebucht“.

| Sitzplatz-Zustand | Darstellung |
|---|---|
| Frei | Grau, anklickbar |
| Eigene Reservierung | Rot, mit Countdown |
| Fremde Reservierung | Goldgelb mit Schloss, deaktiviert |
| Gebucht | Dunkel mit × |

### Kontosicherheit

* **Passwort-Reset:** signierter Token (HMAC mit `TOKEN_SECRET`), 15 Minuten gültig, enthält einen
  Fingerabdruck des Passwort-Hashes und ist damit nach der Passwortänderung ungültig. Die Antwort ist
  immer gleich, egal ob das Konto existiert (keine User Enumeration); 2 Minuten Sperrfrist pro Konto.
* **Brute-Force-Schutz:** nach fünf Fehlversuchen pro IP + E-Mail 15 Minuten Sperre (HTTP 429).
* **Rollen:** nur Administratoren dürfen das Attribut `admin` übermitteln; der letzte Administrator
  kann weder herabgestuft noch gelöscht werden.
* **Session:** signiertes Cookie (`httpOnly`, `SameSite=Lax`).
* **CSRF:** Statt Rails' `authenticity_token` verlangt die API bei schreibenden Anfragen den Header
  `X-Requested-With: XMLHttpRequest`, den fremde Seiten ohne CORS-Freigabe nicht setzen können.

---

## 🧪 Tests

Vitest und Stryker sind installiert und konfiguriert; **die Tests selbst schreiben wir im Modul 450.**
Bis dahin läuft `npm test` ohne Testdateien erfolgreich durch.

| Projekt | Umgebung | Testdateien |
|---|---|---|
| `server` | Node | `server/**/*.test.js` |
| `client` | jsdom (simulierter Browser, mit `@testing-library/jest-dom`) | `client/**/*.test.{js,jsx}` |

```bash
npm test                                         # alle Tests
npx vitest --project server                      # nur ein Projekt
npm run test:coverage                            # Abdeckung -> coverage/index.html
npm run test:mutation                            # Stryker -> reports/mutation/index.html
npx stryker run --mutate server/src/domain/validation.js   # schneller: nur eine Datei
```

### Gut testbar gebaut

* **Reine Funktionen** ohne Datenbank: `server/src/domain/*`, die `validate…`-Funktionen in
  `server/src/models/*`, alle Policies, `client/src/lib/*`. Ideal für Unit- und Mutationstests.
* **Injizierte Uhr:** Fast alle Funktionen erhalten die aktuelle Zeit als Parameter (`now`), und
  `createApp` nimmt eine `clock` entgegen – Ablaufzeiten lassen sich so ohne Warten testen.
* **App-Fabrik:** `createApp({ db, config, mailer, clock })` lässt sich mit Supertest ohne laufenden
  Server ansprechen. `createMailer({ mode: "memory" })` sammelt Mails in `mailer.deliveries`.
* **Testdatenbank:** `kinoarena_test` (Vitest setzt `NODE_ENV=test`, `createDb("test")`).
  Tests, die in dieselbe Datenbank schreiben, nicht parallel laufen lassen
  (`fileParallelism: false` im Projekt `server`) – das gilt auch für Stryker.

```js
// Skizze für einen API-Test mit Supertest
import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createDb } from "../src/db/connection.js";
import { createMailer } from "../src/services/mailer.js";

const app = createApp({ db: createDb("test"), config: loadConfig(), mailer: createMailer({ mode: "memory" }) });
const response = await request(app).get("/api/showtimes");
```

Für schreibende Anfragen den Header `X-Requested-With: XMLHttpRequest` mitsenden.

### Testfälle des Originals als Vorlage

Das Original hat 27 Testdateien mit 130 Testfällen. So verteilen sie sich auf die JS-Module:

| Rails-Testdatei | Tests | JS-Modul |
|---|---|---|
| `models/auditorium_test.rb` | 6 | `models/auditoria.js`, `domain/seatRows.js` |
| `models/booking_test.rb` | 4 | `models/bookings.js` |
| `models/movie_test.rb` | 2 | `models/movies.js`, `domain/labels.js` |
| `models/seat_hold_test.rb` | 6 | `models/seatHolds.js` |
| `models/seat_test.rb` | 2 | `models/seats.js`, `domain/labels.js` |
| `models/showtime_test.rb` | 3 | `models/showtimes.js`, `models/locking.js` |
| `models/user_test.rb` | 9 | `models/users.js`, `domain/passwordResetToken.js` |
| `controllers/sessions_controller_test.rb` | 6 | `routes/sessions.js`, `domain/loginThrottle.js` |
| `controllers/registrations_controller_test.rb` | 4 | `routes/registrations.js` |
| `controllers/password_resets_controller_test.rb` | 10 | `routes/passwordResets.js` |
| `controllers/showtimes_controller_test.rb` | 2 | `routes/showtimes.js` |
| `controllers/movies_controller_test.rb` | 2 | `routes/movies.js` |
| `controllers/seat_holds_controller_test.rb` | 7 | `routes/seatHolds.js` |
| `controllers/checkouts_controller_test.rb` | 4 | `routes/checkouts.js` |
| `controllers/bookings_controller_test.rb` | 12 | `routes/bookings.js`, `services/bookingService.js` |
| `controllers/users_controller_test.rb` | 10 | `routes/users.js`, `policies/userPolicy.js` |
| `controllers/admin/*_controller_test.rb` | 17 | `routes/admin/*.js`, `policies/*` |
| `integration/concurrent_booking_test.rb` | 1 | `services/bookingService.js` (parallel mit `Promise.all`) |
| `integration/error_handling_test.rb` | 4 | `middleware/errorHandler.js` |
| `integration/spielplan_performance_test.rb` | 2 | `models/showtimes.js` (`upcomingProgramme`) |
| `mailers/user_mailer_test.rb` | 1 | `services/mailer.js` |
| `system/*_test.rb` | 16 | `client/src/pages/*`, `components/SeatMap.jsx` (Testing Library) |

Neu und im Original nicht separat getestet: `domain/validation.js`, `client/src/lib/format.js`,
`client/src/lib/seatMapState.js`.

---

## 📊 NFA-3: Lasttest des Spielplans

```bash
npm run benchmark:showtimes
REQUESTS=100 CONCURRENCY=50 LIMIT=1.5 URL=http://localhost:3000/api/showtimes npm run benchmark:showtimes
```

Der Lasttest wärmt den Server auf, sendet dann 50 Anfragen gleichzeitig an `/api/showtimes` und
bricht mit Fehlercode ab, wenn eine Anfrage länger als 1,5 s dauert. Die Programmübersicht braucht
unabhängig von der Anzahl Filme genau drei Datenbankabfragen (kein N+1).

---

## ↔️ Abweichungen vom Original

**Behobene Fehler** (im Original nicht durch Tests abgedeckt):

1. Ein Saal mit 26 Reihen erhält jetzt die Reihen A–Z. Das Original nutzte den exklusiven Bereich
   `("A"..."Z")` und erzeugte nur A–Y, obwohl `total_seats` 26 Reihen zählte.
2. Die Poster-URL aus dem Admin-Filmformular wird gespeichert. Im Original fehlte `poster_url` in
   `MoviePolicy#permitted_attributes` und wurde stillschweigend verworfen.
3. Der letzte Administrator kann sein eigenes Konto nicht mehr löschen. Im Original erlaubte
   `UserPolicy#destroy?` das eigene Konto vor der Prüfung auf den letzten Administrator.

**Technisch bedingt:**

* Server-Sent Events statt Turbo Streams; React-SPA mit JSON-API statt serverseitig gerenderter Seiten.
* CSRF-Schutz über den Header `X-Requested-With` statt `authenticity_token`.
* `activity_logs.description` ist `TEXT` statt `VARCHAR(255)`: lange Buchungsbeschreibungen
  würden sonst in MariaDB abgewiesen.
* Löscht jemand sein eigenes Konto, wird der Protokolleintrag ohne Benutzerbezug geschrieben
  (im Original scheiterte der Eintrag still am Fremdschlüssel).
* Aufzählungen in Fehlermeldungen enden auf „und“ statt auf das englische „and“.
* Der Passwort-Reset-Link ist ein HMAC-signierter Token statt eines Rails-`MessageVerifier`-Tokens.

**Nicht portiert:** Deployment (Kamal, Dockerfile), PWA-Platzhalter, Solid Cache/Queue/Cable,
GitHub-CI, brakeman/bundler-audit (stattdessen `npm audit`).
