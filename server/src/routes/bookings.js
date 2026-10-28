import { Router } from "express";
import { RecordInvalid, RecordNotUnique } from "../errors.js";
import { seatLabel } from "../domain/labels.js";
import { normalizePaymentMethod, paymentMethodLabel } from "../domain/paymentMethods.js";
import { isBlank, toSentence } from "../domain/validation.js";
import { target } from "../models/activityLogs.js";
import { deleteBooking, findBookingDetailed, listBookings } from "../models/bookings.js";
import { findShowtime } from "../models/showtimes.js";
import { authorize } from "../policies/applicationPolicy.js";
import { BookingPolicy } from "../policies/bookingPolicy.js";
import { requireUser } from "../middleware/auth.js";
import { toArray } from "../middleware/context.js";
import { createBookings } from "../services/bookingService.js";
import { qrCodeSvg } from "../services/qrCode.js";
import { seatChanged } from "../services/seatBroadcast.js";
import { releaseExpiredHolds } from "../services/seatHoldService.js";

// FA-3/FA-4/FA-Opt-3: Buchen, Tickets ansehen, Stornieren (BookingsController)
export function bookingsRouter(deps) {
  const { db } = deps;
  const router = Router();

  router.use(requireUser);

  router.get("/", async (req, res) => {
    const user = req.currentUser;
    const bookings = await listBookings(db, (query) => BookingPolicy.scope(user, query));

    res.json({
      bookings: bookings.map((booking) => ({
        ...booking,
        upcoming: new Date(booking.showtime.start_time) > req.now,
        can_destroy: new BookingPolicy(user, booking, { now: req.now }).destroy()
      }))
    });
  });

  router.get("/:id", async (req, res) => {
    const booking = await findBookingDetailed(db, req.params.id);
    authorize(new BookingPolicy(req.currentUser, booking, { now: req.now }), "show");

    res.json({ booking: { ...booking, qr_svg: await qrCodeSvg(booking.qr_code_token, { size: 140 }) } });
  });

  router.post("/", async (req, res) => {
    const showtime = await findShowtime(db, req.body.showtime_id);
    await releaseExpiredHolds({ ...deps, now: req.now });

    const seatIds = toArray(req.body.seat_ids).filter((id) => !isBlank(id));
    if (seatIds.length === 0) {
      res.status(422).json({ alert: "Bitte waehle mindestens einen Sitzplatz aus.", showtime_id: showtime.id });
      return;
    }

    authorize(new BookingPolicy(req.currentUser, null), "create");
    const paymentMethod = normalizePaymentMethod(req.body.payment_method);

    try {
      const { bookings, seats } = await createBookings({
        ...deps,
        now: req.now,
        user: req.currentUser,
        showtimeId: showtime.id,
        seatIds,
        paymentMethod
      });

      await req.logActivity("booking_created", {
        target: target("Showtime", showtime),
        description: `${bookings.length} Ticket(s) via ${paymentMethodLabel(paymentMethod)} gebucht: ` +
          seats.map(seatLabel).join(", ")
      });
      res.status(201).json({
        notice: "Zahlung erfolgreich. Deine Tickets sind bereit.",
        booking_ids: bookings.map((booking) => booking.id)
      });
    } catch (error) {
      if (error instanceof RecordNotUnique) {
        // NFA-1: Unique-Index auf [showtime_id, seat_id] hat eine Doppelbuchung verhindert
        await req.logActivity("booking_conflict", {
          target: target("Showtime", showtime),
          description: "Doppelbuchung verhindert (DB-Constraint)"
        });
        res.status(409).json({
          alert: "Dieser Sitzplatz wurde gerade von jemand anderem gebucht. Bitte waehle einen anderen Platz.",
          showtime_id: showtime.id
        });
      } else if (error instanceof RecordInvalid) {
        const messages = toSentence(error.errors.fullMessages());
        await req.logActivity("booking_failed", { target: target("Showtime", showtime), description: messages });
        res.status(422).json({ alert: `Buchung nicht moeglich: ${messages}`, showtime_id: showtime.id });
      } else {
        throw error;
      }
    }
  });

  router.delete("/:id", async (req, res) => {
    const booking = await findBookingDetailed(db, req.params.id);
    authorize(new BookingPolicy(req.currentUser, booking, { now: req.now }), "destroy");

    await deleteBooking(db, booking);
    await seatChanged({ ...deps, now: req.now }, booking.showtime_id, booking.seat_id);
    await req.logActivity("booking_cancelled", {
      target: { type: "Showtime", id: booking.showtime_id },
      description: `Ticket ${booking.seat.label} storniert`
    });
    res.json({ notice: "Ticket wurde storniert." });
  });

  return router;
}
