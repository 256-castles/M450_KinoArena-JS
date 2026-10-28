import { RecordInvalid, RecordNotFound } from "../errors.js";
import { seatLabel } from "../domain/labels.js";
import { Errors } from "../domain/validation.js";
import { buildBooking, insertBooking } from "../models/bookings.js";
import { activeHolds, deleteHoldsForSeats } from "../models/seatHolds.js";
import { seatsByIds } from "../models/seats.js";
import { seatsChanged } from "./seatBroadcast.js";

function invalidSeat(message) {
  return new RecordInvalid(new Errors("booking").add("seat", message));
}

// Prueft die gewaehlten Plaetze (BookingsController#build_bookings).
async function checkSeats(trx, { showtime, seatIds, user, now }) {
  const seats = await seatsByIds(trx, showtime.auditorium_id, seatIds);
  if (seats.length !== seatIds.length) throw invalidSeat("gehoert nicht zum Saal dieser Vorstellung");

  // Die Anzeige im Saalplan ist nur die Komfortschicht. Auch wer die
  // Oberflaeche umgeht, wird hier serverseitig gestoppt.
  const seatIdSet = new Set(seats.map((seat) => seat.id));
  const reservedByOthers = (await activeHolds(trx, showtime.id, now))
    .filter((hold) => seatIdSet.has(hold.seat_id) && hold.user_id !== user.id);

  if (reservedByOthers.length > 0) {
    const labels = seats.filter((seat) => reservedByOthers.some((hold) => hold.seat_id === seat.id)).map(seatLabel);
    throw invalidSeat(`${labels.join(", ")} wird gerade von einer anderen Person gebucht`);
  }
  return seats;
}

// FA-3: Bucht die gewaehlten Plaetze einer Vorstellung.
// Wirft RecordInvalid (Validierung) oder RecordNotUnique (Unique-Index).
export async function createBookings({ db, broadcaster, now, user, showtimeId, seatIds, paymentMethod = null }) {
  // NFA-1 Stufe 4: Pessimistic Lock auf der Vorstellung. Pruefung der
  // Sitzplaetze und Insert laufen dadurch als eine ununterbrechbare Einheit;
  // eine parallele Buchung wartet, statt auf veralteten Daten zu entscheiden.
  const result = await db.transaction(async (trx) => {
    const showtime = await trx("showtimes").where({ id: showtimeId }).forUpdate().first();
    if (!showtime) throw new RecordNotFound("Showtime", showtimeId);

    const seats = await checkSeats(trx, { showtime, seatIds, user, now });

    const bookings = [];
    for (const seat of seats) {
      const booking = buildBooking({ userId: user.id, showtime, seat, paymentMethod });
      bookings.push(await insertBooking(trx, booking, { seat, showtime, now }));
    }

    // Die Reservierung wird in eine Buchung ueberfuehrt.
    await deleteHoldsForSeats(trx, showtime.id, seats.map((seat) => seat.id));
    return { showtime, seats, bookings };
  });

  await seatsChanged({ db, broadcaster, now }, result.showtime.id, result.seats.map((seat) => seat.id));
  return result;
}
