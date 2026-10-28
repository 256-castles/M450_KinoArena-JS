import { Router } from "express";
import { PAYMENT_METHODS } from "../domain/paymentMethods.js";
import { isBlank } from "../domain/validation.js";
import { earliestOwnExpiry } from "../models/seatHolds.js";
import { presentSeat, seatsByIds } from "../models/seats.js";
import { findShowtimeDetailed } from "../models/showtimes.js";
import { requireUser } from "../middleware/auth.js";
import { toArray } from "../middleware/context.js";
import { releaseExpiredHolds } from "../services/seatHoldService.js";

export const BOOKING_FEE = 0;

function roundCents(amount) {
  return Math.round(amount * 100) / 100;
}

// FA-Opt-2: Bestaetigung und Zahlungsauswahl vor der eigentlichen Buchung (CheckoutsController)
export function checkoutsRouter(deps) {
  const { db } = deps;
  const router = Router({ mergeParams: true });

  router.get("/", requireUser, async (req, res) => {
    const showtime = await findShowtimeDetailed(db, req.params.showtimeId);
    await releaseExpiredHolds({ ...deps, now: req.now });

    const seatIds = toArray(req.query.seat_ids).filter((id) => !isBlank(id));
    const seats = seatIds.length > 0 ? await seatsByIds(db, showtime.auditorium_id, seatIds) : [];
    if (seats.length === 0) {
      res.status(422).json({ alert: "Bitte wähle zuerst mindestens einen Sitzplatz aus." });
      return;
    }

    const subtotal = roundCents(showtime.price * seats.length);
    const holdExpiresAt = await earliestOwnExpiry(db, {
      showtimeId: showtime.id,
      seatIds: seats.map((seat) => seat.id),
      userId: req.currentUser.id,
      now: req.now
    });

    res.json({
      showtime,
      seats: seats.map(presentSeat),
      subtotal,
      booking_fee: BOOKING_FEE,
      total: roundCents(subtotal + BOOKING_FEE),
      hold_expires_at: holdExpiresAt,
      payment_methods: Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label }))
    });
  });

  return router;
}
