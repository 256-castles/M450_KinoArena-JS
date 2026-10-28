// Idempotente Beispieldaten fuer KinoArena (Portierung von db/seeds.rb).
// Ausfuehren mit: npm run db:seed
import { randomBytes } from "node:crypto";
import { DateTime } from "luxon";
import { TIME_ZONE } from "../../domain/time.js";
import { createAuditorium } from "../../models/auditoria.js";
import { buildBooking, insertBooking } from "../../models/bookings.js";
import { createMovie, updateMovie } from "../../models/movies.js";
import { listSeats } from "../../models/seats.js";
import { createShowtime, updateShowtime } from "../../models/showtimes.js";
import { createUser, findUserByEmail, updateUser } from "../../models/users.js";

const MOVIES = [
  {
    title: "Blade Runner 2099",
    description:
      "In den neonhellen Megastädten des Jahres 2099 muss ein neuer Blade Runner die " +
      "verschwimmende Grenze zwischen Mensch und Maschine ergründen, während ein " +
      "abtrünniges KI-Kollektiv die Zivilisation bedroht.",
    duration_minutes: 142,
    poster_url: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80"
  },
  {
    title: "Die Ostschweizer Nacht",
    description:
      "Ein Schweizer Kriminalfilm: Eine Kommissarin jagt in den Gassen von St. Gallen " +
      "einen Täter, der immer einen Schritt voraus zu sein scheint.",
    duration_minutes: 112,
    poster_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80"
  },
  {
    title: "Nebula Run",
    description:
      "Ein Schmugglerschiff nimmt am gefährlichsten Rennen der Galaxie teil – " +
      "quer durch einen kollabierenden Nebel.",
    duration_minutes: 128,
    poster_url: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=600&q=80"
  },
  {
    title: "Papiermond",
    description:
      "Eine handgezeichnete Animation über ein Mädchen, das jede Nacht in eine " +
      "Welt aus Papier reist, um ihren verlorenen Bruder zu suchen.",
    duration_minutes: 96,
    poster_url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&q=80"
  },
  {
    title: "Hollywood 1949",
    description: "Ein Historiendrama über die Traumfabrik der Nachkriegszeit und den Preis des Ruhms.",
    duration_minutes: 134,
    poster_url: "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=600&q=80"
  }
];

const AUDITORIA = [
  { name: "Saal 1 – Grand", row_count: 10, seats_per_row: 14 },
  { name: "Saal 2 – Studio", row_count: 6, seats_per_row: 10 }
];

// Vorbelegte Plaetze, damit der Saalplan belegte Sitze zeigt.
const OCCUPANCY_RATES = [0.45, 0.2, 0.6, 0.15, 0.35, 0.05];

// Kleiner deterministischer Zufallsgenerator (mulberry32): feste Saat =>
// bei jedem Seed dasselbe Muster. Ruby's Random liefert ein anderes Muster.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(items, count, random) {
  const pool = [...items];
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

async function upsertUser(db, { email_address, name, admin, password }, now) {
  const existing = await findUserByEmail(db, email_address);
  if (existing) return updateUser(db, existing, { name, admin }, { now });
  return createUser(db, { email_address, name, admin, password, password_confirmation: password }, { now });
}

export async function seed(db) {
  const now = new Date();

  await upsertUser(db, { email_address: "admin@kinoarena.test", name: "Mara Spichiger", admin: true, password: "password123" }, now);

  // Zwei Kunden, um die Doppelbuchungssperre (NFA-1) live vorzufuehren.
  await upsertUser(db, { email_address: "anna@example.com", name: "Anna Kundin", admin: false, password: "annaanna" }, now);
  await upsertUser(db, { email_address: "ben@example.com", name: "Ben Kunde", admin: false, password: "benbenben" }, now);

  // Sammelkonto fuer die vorbelegten Plaetze, damit die Demo-Kunden leere Ticketlisten haben.
  const boxOffice = await upsertUser(
    db,
    { email_address: "abendkasse@kinoarena.test", name: "Abendkasse", admin: false, password: randomBytes(16).toString("hex") },
    now
  );

  const movies = [];
  for (const attrs of MOVIES) {
    const existing = await db("movies").where({ title: attrs.title }).first();
    movies.push(existing ? await updateMovie(db, existing, attrs, { now }) : await createMovie(db, attrs, { now }));
  }

  // Sitzplaetze werden nur beim erstmaligen Anlegen erzeugt.
  const auditoria = [];
  for (const config of AUDITORIA) {
    const existing = await db("auditoria").where({ name: config.name }).first();
    auditoria.push(existing ?? (await createAuditorium(db, config, { now })));
  }

  const today = DateTime.fromJSDate(now, { zone: TIME_ZONE }).startOf("day");
  const at = (days, hours, minutes = 0) => today.plus({ days }).plus({ hours, minutes }).toJSDate();
  const planned = [
    [movies[0], auditoria[0], at(0, 18), 14.5],
    [movies[0], auditoria[0], at(0, 21, 15), 14.5],
    [movies[1], auditoria[1], at(0, 19, 30), 16.0],
    [movies[2], auditoria[1], at(1, 20), 16.5],
    [movies[3], auditoria[0], at(1, 15), 12.0],
    [movies[4], auditoria[0], at(2, 19), 18.0]
  ];

  // Termine aus frueheren Seed-Laeufen entfernen. Ohne das kollidiert der neue
  // Spielplan mit den alten Vorstellungen, sobald seit dem letzten Seed ein Tag
  // vergangen ist. Buchungen und Reservierungen fallen per Fremdschluessel mit weg.
  await db("showtimes")
    .whereIn("auditorium_id", auditoria.map((a) => a.id))
    .whereIn("movie_id", movies.map((m) => m.id))
    .whereNotIn("start_time", planned.map(([, , startTime]) => startTime))
    .del();

  const showtimes = [];
  for (const [movie, auditorium, startTime, price] of planned) {
    if (startTime < now) continue;

    const existing = await db("showtimes")
      .where({ movie_id: movie.id, auditorium_id: auditorium.id, start_time: startTime })
      .first();
    const attrs = { movie_id: movie.id, auditorium_id: auditorium.id, start_time: startTime, price };
    showtimes.push(existing ? await updateShowtime(db, existing, attrs, { now }) : await createShowtime(db, attrs, { now }));
  }

  for (const [index, showtime] of showtimes.entries()) {
    const seats = await listSeats(db, showtime.auditorium_id);
    const rate = OCCUPANCY_RATES[index % OCCUPANCY_RATES.length];
    const taken = sample(seats, Math.round(seats.length * rate), seededRandom(1000 + index));

    for (const seat of taken) {
      const booked = await db("bookings").where({ showtime_id: showtime.id, seat_id: seat.id }).first("id");
      if (booked) continue;
      await insertBooking(db, buildBooking({ userId: boxOffice.id, showtime, seat }), { seat, showtime, now });
    }
  }

  const count = async (table) => Number((await db(table).count({ count: "*" }).first()).count);
  console.log(
    `Seed abgeschlossen: ${await count("users")} Benutzer, ${await count("movies")} Filme, ` +
      `${await count("auditoria")} Saele, ${await count("seats")} Sitze, ` +
      `${await count("showtimes")} Vorstellungen, ${await count("bookings")} Buchungen.`
  );
}
