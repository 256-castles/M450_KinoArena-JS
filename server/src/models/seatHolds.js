import { RecordInvalid, translateDuplicate } from "../errors.js";
import { MINUTE_MS } from "../domain/time.js";
import { Errors } from "../domain/validation.js";

// FA-Opt-1: Ein Sitzplatz wird beim Anklicken fuer 5 Minuten reserviert.
export const HOLD_DURATION_MS = 5 * MINUTE_MS;

export function holdExpiry(now) {
  return new Date(now.getTime() + HOLD_DURATION_MS);
}

export function remainingSeconds(hold, now) {
  return Math.max(Math.ceil((hold.expires_at.getTime() - now.getTime()) / 1000), 0);
}

export function isHeldBy(hold, user) {
  return Boolean(user) && hold.user_id === user.id;
}

// scope :active
export async function activeHolds(db, showtimeId, now) {
  return db("seat_holds").where({ showtime_id: showtimeId }).where("expires_at", ">=", now);
}

export async function activeHold(db, showtimeId, seatId, now) {
  return db("seat_holds")
    .where({ showtime_id: showtimeId, seat_id: seatId })
    .where("expires_at", ">=", now)
    .first();
}

// Gibt abgelaufene Reservierungen frei; onReleased meldet die Plaetze an alle Clients.
export async function releaseExpired(db, { now, onReleased = async () => {} }) {
  const expired = await db("seat_holds").where("expires_at", "<", now);
  for (const hold of expired) {
    const deleted = await db("seat_holds").where({ id: hold.id }).del();
    if (deleted > 0) await onReleased(hold);
  }
  return expired.length;
}

export async function createHold(db, { showtime, seat, user, now }) {
  const errors = new Errors("seat_hold");
  if (await db("bookings").where({ showtime_id: showtime.id, seat_id: seat.id }).first("id")) {
    errors.add("seat", "ist bereits gebucht");
  }
  if (errors.any) throw new RecordInvalid(errors);

  // Unique-Index [showtime_id, seat_id]: zwei gleichzeitige Klicks -> RecordNotUnique
  return translateDuplicate(async () => {
    const hold = {
      showtime_id: showtime.id,
      seat_id: seat.id,
      user_id: user.id,
      expires_at: holdExpiry(now),
      created_at: now,
      updated_at: now
    };
    const [id] = await db("seat_holds").insert(hold);
    return { ...hold, id };
  });
}

export async function findOwnHold(db, showtimeId, seatId, userId) {
  return db("seat_holds").where({ showtime_id: showtimeId, seat_id: seatId, user_id: userId }).first();
}

export async function deleteHold(db, hold) {
  await db("seat_holds").where({ id: hold.id }).del();
}

export async function deleteHoldsForSeats(db, showtimeId, seatIds) {
  await db("seat_holds").where({ showtime_id: showtimeId }).whereIn("seat_id", seatIds).del();
}

// Fruehester Ablauf der eigenen Reservierungen (CheckoutsController)
export async function earliestOwnExpiry(db, { showtimeId, seatIds, userId, now }) {
  const row = await db("seat_holds")
    .where({ showtime_id: showtimeId, user_id: userId })
    .whereIn("seat_id", seatIds)
    .where("expires_at", ">=", now)
    .min({ expires_at: "expires_at" })
    .first();
  return row?.expires_at ?? null;
}
