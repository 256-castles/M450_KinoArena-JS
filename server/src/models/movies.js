import { RecordInvalid, RecordNotFound } from "../errors.js";
import { durationLabel } from "../domain/labels.js";
import {
  Errors,
  isBlank,
  parseNumber,
  validateFormat,
  validateLength,
  validateNumericality,
  validatePresence
} from "../domain/validation.js";
import { submittedLockVersion, updateWithLock } from "./locking.js";

export const TITLE_MAX_LENGTH = 120;
export const DURATION_MAX_MINUTES = 600;
const POSTER_URL_FORMAT = /^https:\/\/\S+$/;

export const MOVIE_ATTRIBUTES = ["title", "description", "duration_minutes", "poster_url"];

export function validateMovie(attrs) {
  const errors = new Errors("movie");
  validatePresence(errors, "title", attrs.title);
  validateLength(errors, "title", attrs.title, { maximum: TITLE_MAX_LENGTH });
  validatePresence(errors, "description", attrs.description);
  validatePresence(errors, "duration_minutes", attrs.duration_minutes);
  validateNumericality(errors, "duration_minutes", attrs.duration_minutes, {
    onlyInteger: true,
    greaterThan: 0,
    lessThanOrEqualTo: DURATION_MAX_MINUTES
  });
  if (!isBlank(attrs.poster_url)) {
    validateFormat(errors, "poster_url", attrs.poster_url, POSTER_URL_FORMAT, "muss eine https-URL sein");
  }
  return errors;
}

function toColumns(attrs) {
  return {
    title: attrs.title,
    description: attrs.description,
    duration_minutes: parseNumber(attrs.duration_minutes),
    poster_url: isBlank(attrs.poster_url) ? null : attrs.poster_url
  };
}

export function presentMovie(movie) {
  return { ...movie, duration_label: durationLabel(movie.duration_minutes) };
}

export async function findMovie(db, id) {
  const movie = await db("movies").where({ id }).first();
  if (!movie) throw new RecordNotFound("Movie", id);
  return movie;
}

export async function listMoviesWithShowtimeCounts(db) {
  const rows = await db("movies")
    .select("movies.*")
    .select(db("showtimes").count("*").whereRaw("showtimes.movie_id = movies.id").as("showtimes_count"))
    .orderBy("title");
  return rows.map((row) => ({ ...presentMovie(row), showtimes_count: Number(row.showtimes_count) }));
}

export async function createMovie(db, params, { now }) {
  const errors = validateMovie(params);
  if (errors.any) throw new RecordInvalid(errors);

  const [id] = await db("movies").insert({ ...toColumns(params), created_at: now, updated_at: now });
  return findMovie(db, id);
}

export async function updateMovie(db, movie, params, { now }) {
  const attrs = { ...movie, ...params };
  const errors = validateMovie(attrs);
  if (errors.any) throw new RecordInvalid(errors);

  await updateWithLock(db, "movies", movie.id, submittedLockVersion(params, movie), {
    ...toColumns(attrs),
    updated_at: now
  });
  return findMovie(db, movie.id);
}

// has_many :showtimes, dependent: :restrict_with_error
export async function deleteMovie(db, movie) {
  const errors = new Errors("movie");
  if (await db("showtimes").where({ movie_id: movie.id }).first("id")) {
    errors.add("base", "Film kann nicht gelöscht werden, solange Vorstellungen geplant sind");
    return errors;
  }
  await db("movies").where({ id: movie.id }).del();
  return errors;
}
