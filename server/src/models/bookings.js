import { randomUUID } from "node:crypto";
import { RecordInvalid, RecordNotFound, translateDuplicate } from "../errors.js";
import { bookingReference, durationLabel, seatLabel } from "../domain/labels.js";
import { isPaymentMethod, paymentMethodLabel } from "../domain/paymentMethods.js";
import { Errors, MESSAGES, validateNumericality, validatePresence } from "../domain/validation.js";

export function validateBooking(booking, { seat, showtime, seatTaken = false, tokenTaken = false }) {
  const errors = new Errors("booking");
  if (!showtime) errors.add("showtime", MESSAGES.blank);
  if (!seat) errors.add("seat", MESSAGES.blank);

  validatePresence(errors, "qr_code_token", booking.qr_code_token);
  if (tokenTaken) errors.add("qr_code_token", MESSAGES.taken);
  validatePresence(errors, "total_price", booking.total_price);
  validateNumericality(errors, "total_price", booking.total_price, { greaterThanOrEqualTo: 0 });

  if (seatTaken) errors.add("seat_id", "ist für diese Vorstellung bereits gebucht");
  if (booking.payment_method !== null && booking.payment_method !== undefined && !isPaymentMethod(booking.payment_method)) {
    errors.add("payment_method", "ist keine gültige Zahlungsmethode");
  }
  if (seat && showtime && seat.auditorium_id !== showtime.auditorium_id) {
    errors.add("seat", "gehört nicht zum Saal dieser Vorstellung");
  }
  return errors;
}

// before_validation :assign_qr_code_token / :assign_total_price
export function buildBooking({ userId, showtime, seat, paymentMethod = null, token = randomUUID() }) {
  return {
    user_id: userId,
    showtime_id: showtime.id,
    seat_id: seat.id,
    qr_code_token: token,
    total_price: showtime.price,
    payment_method: paymentMethod
  };
}

export async function insertBooking(db, booking, { seat, showtime, now }) {
  const [seatTaken, tokenTaken] = await Promise.all([
    db("bookings").where({ showtime_id: booking.showtime_id, seat_id: booking.seat_id }).first("id"),
    db("bookings").where({ qr_code_token: booking.qr_code_token }).first("id")
  ]);

  const errors = validateBooking(booking, {
    seat,
    showtime,
    seatTaken: Boolean(seatTaken),
    tokenTaken: Boolean(tokenTaken)
  });
  if (errors.any) throw new RecordInvalid(errors);

  // NFA-1 Stufe 1: Die Validierung oben faengt den Normalfall ab, der Unique-Index
  // [showtime_id, seat_id] den echten Wettlauf (-> RecordNotUnique).
  return translateDuplicate(async () => {
    const [id] = await db("bookings").insert({ ...booking, created_at: now, updated_at: now });
    return { ...booking, id, created_at: now };
  });
}

function selectDetailed(db) {
  return db("bookings")
    .join("showtimes", "showtimes.id", "bookings.showtime_id")
    .join("movies", "movies.id", "showtimes.movie_id")
    .join("auditoria", "auditoria.id", "showtimes.auditorium_id")
    .join("seats", "seats.id", "bookings.seat_id")
    .join("users", "users.id", "bookings.user_id")
    .select(
      "bookings.*",
      "showtimes.start_time as showtime_start_time",
      "showtimes.price as showtime_price",
      "showtimes.auditorium_id as showtime_auditorium_id",
      "movies.id as movie_id",
      "movies.title as movie_title",
      "movies.poster_url as movie_poster_url",
      "movies.duration_minutes as movie_duration_minutes",
      "auditoria.name as auditorium_name",
      "seats.row as seat_row",
      "seats.number as seat_number",
      "users.email_address as user_email_address",
      "users.name as user_name"
    );
}

export function presentBooking(row) {
  const seat = { id: row.seat_id, row: row.seat_row, number: row.seat_number };
  return {
    id: row.id,
    user_id: row.user_id,
    showtime_id: row.showtime_id,
    seat_id: row.seat_id,
    qr_code_token: row.qr_code_token,
    reference: bookingReference(row.qr_code_token),
    total_price: row.total_price,
    payment_method: row.payment_method,
    payment_method_label: paymentMethodLabel(row.payment_method),
    created_at: row.created_at,
    user: { id: row.user_id, name: row.user_name, email_address: row.user_email_address },
    seat: { ...seat, label: seatLabel(seat) },
    showtime: {
      id: row.showtime_id,
      start_time: row.showtime_start_time,
      price: row.showtime_price,
      movie: {
        id: row.movie_id,
        title: row.movie_title,
        poster_url: row.movie_poster_url,
        duration_label: durationLabel(row.movie_duration_minutes)
      },
      auditorium: { id: row.showtime_auditorium_id, name: row.auditorium_name }
    }
  };
}

// scope :recent_first; scopeFn schraenkt die Abfrage gemaess Policy-Scope ein
export async function listBookings(db, scopeFn = (query) => query) {
  const rows = await scopeFn(selectDetailed(db)).orderBy("bookings.created_at", "desc").orderBy("bookings.id", "desc");
  return rows.map(presentBooking);
}

export async function findBookingDetailed(db, id) {
  const row = await selectDetailed(db).where("bookings.id", id).first();
  if (!row) throw new RecordNotFound("Booking", id);
  return presentBooking(row);
}

export async function deleteBooking(db, booking) {
  await db("bookings").where({ id: booking.id }).del();
}
