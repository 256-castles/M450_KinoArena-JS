import { RecordInvalid, RecordNotFound } from "../errors.js";
import { durationLabel, showtimeLabel } from "../domain/labels.js";
import { MINUTE_MS, parseDateTime } from "../domain/time.js";
import { Errors, MESSAGES, isBlank, parseNumber, toInteger, validateNumericality, validatePresence } from "../domain/validation.js";
import { submittedLockVersion, updateWithLock } from "./locking.js";

export const SHOWTIME_ATTRIBUTES = ["movie_id", "auditorium_id", "start_time", "price"];

export function validateShowtime(attrs, { isNew, now, movie, auditorium, clash = false }) {
  const errors = new Errors("showtime");
  if (!movie) errors.add("movie", MESSAGES.blank);
  if (!auditorium) errors.add("auditorium", MESSAGES.blank);
  validatePresence(errors, "start_time", attrs.start_time);
  validatePresence(errors, "price", attrs.price);
  validateNumericality(errors, "price", attrs.price, { greaterThanOrEqualTo: 0 });

  if (isNew && attrs.start_time && attrs.start_time.getTime() < now.getTime()) {
    errors.add("start_time", "darf nicht in der Vergangenheit liegen");
  }
  if (clash) errors.add("start_time", "kollidiert mit einer anderen Vorstellung in diesem Saal");
  return errors;
}

// Showtime#auditorium_free_at_start_time: Fenster von +/- Filmdauer um den Beginn
export function clashWindow(startTime, durationMinutes) {
  const span = toInteger(durationMinutes) * MINUTE_MS;
  return { from: new Date(startTime.getTime() - span), to: new Date(startTime.getTime() + span) };
}

async function hasClash(db, { auditoriumId, startTime, durationMinutes, exceptId }) {
  const { from, to } = clashWindow(startTime, durationMinutes);
  const query = db("showtimes").where({ auditorium_id: auditoriumId }).whereBetween("start_time", [from, to]);
  if (exceptId) query.whereNot({ id: exceptId });
  return Boolean(await query.first("id"));
}

function selectDetailed(db) {
  return db("showtimes")
    .join("movies", "movies.id", "showtimes.movie_id")
    .join("auditoria", "auditoria.id", "showtimes.auditorium_id")
    .select(
      "showtimes.*",
      "movies.title as movie_title",
      "movies.poster_url as movie_poster_url",
      "movies.duration_minutes as movie_duration_minutes",
      "auditoria.name as auditorium_name"
    );
}

// Zeile mit Join-Spalten -> verschachteltes Objekt fuer die API
export function presentShowtime(row) {
  return {
    id: row.id,
    movie_id: row.movie_id,
    auditorium_id: row.auditorium_id,
    start_time: row.start_time,
    price: row.price,
    lock_version: row.lock_version,
    label: showtimeLabel(row.movie_title, row.start_time),
    movie: {
      id: row.movie_id,
      title: row.movie_title,
      poster_url: row.movie_poster_url,
      duration_minutes: row.movie_duration_minutes,
      duration_label: durationLabel(row.movie_duration_minutes)
    },
    auditorium: { id: row.auditorium_id, name: row.auditorium_name }
  };
}

export async function findShowtime(db, id) {
  const showtime = await db("showtimes").where({ id }).first();
  if (!showtime) throw new RecordNotFound("Showtime", id);
  return showtime;
}

export async function findShowtimeDetailed(db, id) {
  const row = await selectDetailed(db).where("showtimes.id", id).first();
  if (!row) throw new RecordNotFound("Showtime", id);
  return presentShowtime(row);
}

// ShowtimesController#index: Filme mit kommenden Vorstellungen.
// Drei Abfragen, unabhaengig von der Anzahl Filme (kein N+1, NFA-3).
export async function upcomingProgramme(db, now) {
  const upcoming = db("showtimes").where("start_time", ">=", now);

  const [{ count }] = await upcoming.clone().count({ count: "*" });
  const counts = await upcoming.clone().select("movie_id").count({ count: "*" }).groupBy("movie_id");
  const movies = await db("movies").whereIn("id", upcoming.clone().select("movie_id")).orderBy("title");

  const countByMovie = new Map(counts.map((row) => [row.movie_id, Number(row.count)]));
  return {
    showtimes_count: Number(count),
    movies: movies.map((movie) => ({
      ...movie,
      duration_label: durationLabel(movie.duration_minutes),
      showtimes_count: countByMovie.get(movie.id) ?? 0
    }))
  };
}

// MoviesController#show: kommende Vorstellungen eines Films mit freien Plaetzen
export async function upcomingForMovie(db, movieId, now) {
  const rows = await selectDetailed(db)
    .select(db("seats").count("*").whereRaw("seats.auditorium_id = showtimes.auditorium_id").as("total_seats"))
    .select(db("bookings").count("*").whereRaw("bookings.showtime_id = showtimes.id").as("booked_seats"))
    .where("showtimes.movie_id", movieId)
    .where("showtimes.start_time", ">=", now)
    .orderBy("showtimes.start_time");

  return rows.map((row) => {
    const total = Number(row.total_seats);
    const booked = Number(row.booked_seats);
    return { ...presentShowtime(row), total_seats: total, free_seats: Math.max(total - booked, 0) };
  });
}

// Admin::ShowtimesController#index mit Auslastung
export async function listShowtimesForAdmin(db) {
  const rows = await selectDetailed(db)
    .select(db("seats").count("*").whereRaw("seats.auditorium_id = showtimes.auditorium_id").as("total_seats"))
    .select(db("bookings").count("*").whereRaw("bookings.showtime_id = showtimes.id").as("booked_seats"))
    .orderBy("showtimes.start_time");

  return rows.map((row) => ({
    ...presentShowtime(row),
    total_seats: Number(row.total_seats),
    booked_seats: Number(row.booked_seats)
  }));
}

async function buildAttributes(db, params, current = {}) {
  const merged = { ...current, ...params };
  const attrs = {
    movie_id: isBlank(merged.movie_id) ? null : toInteger(merged.movie_id),
    auditorium_id: isBlank(merged.auditorium_id) ? null : toInteger(merged.auditorium_id),
    start_time: parseDateTime(merged.start_time),
    price: merged.price
  };
  const movie = attrs.movie_id ? await db("movies").where({ id: attrs.movie_id }).first() : null;
  const auditorium = attrs.auditorium_id ? await db("auditoria").where({ id: attrs.auditorium_id }).first() : null;
  return { attrs, movie, auditorium };
}

async function validateWithDatabase(db, { attrs, movie, auditorium }, { isNew, now, exceptId = null }) {
  const clash = Boolean(attrs.start_time && auditorium && movie) && await hasClash(db, {
    auditoriumId: auditorium.id,
    startTime: attrs.start_time,
    durationMinutes: movie.duration_minutes,
    exceptId
  });

  const errors = validateShowtime(attrs, { isNew, now, movie, auditorium, clash });
  if (errors.any) throw new RecordInvalid(errors);
}

function toColumns(attrs) {
  return {
    movie_id: attrs.movie_id,
    auditorium_id: attrs.auditorium_id,
    start_time: attrs.start_time,
    price: parseNumber(attrs.price)
  };
}

export async function createShowtime(db, params, { now }) {
  const built = await buildAttributes(db, params);
  await validateWithDatabase(db, built, { isNew: true, now });

  const [id] = await db("showtimes").insert({ ...toColumns(built.attrs), created_at: now, updated_at: now });
  return findShowtimeDetailed(db, id);
}

export async function updateShowtime(db, showtime, params, { now }) {
  const built = await buildAttributes(db, params, showtime);
  await validateWithDatabase(db, built, { isNew: false, now, exceptId: showtime.id });

  await updateWithLock(db, "showtimes", showtime.id, submittedLockVersion(params, showtime), {
    ...toColumns(built.attrs),
    updated_at: now
  });
  return findShowtimeDetailed(db, showtime.id);
}

// has_many :bookings / :seat_holds, dependent: :destroy (per Fremdschluessel)
export async function deleteShowtime(db, showtime) {
  await db("showtimes").where({ id: showtime.id }).del();
}

export async function listMovieOptions(db) {
  return db("movies").select("id", "title").orderBy("title");
}
