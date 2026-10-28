import { Router } from "express";
import { RecordInvalid, RecordNotUnique } from "../errors.js";
import { toSentence } from "../domain/validation.js";
import { createHold, deleteHold, findOwnHold, remainingSeconds } from "../models/seatHolds.js";
import { findSeatInAuditorium } from "../models/seats.js";
import { findShowtime } from "../models/showtimes.js";
import { requireUser } from "../middleware/auth.js";
import { seatChanged } from "../services/seatBroadcast.js";
import { releaseExpiredHolds } from "../services/seatHoldService.js";

// FA-Opt-1: temporaere Sitzplatzreservierung (SeatHoldsController)
export function seatHoldsRouter(deps) {
  const { db } = deps;
  const router = Router({ mergeParams: true });

  router.use(requireUser);
  router.use(async (req, _res, next) => {
    req.showtime = await findShowtime(db, req.params.showtimeId);
    await releaseExpiredHolds({ ...deps, now: req.now });
    next();
  });

  // Reserviert einen Sitzplatz fuer 5 Minuten.
  router.post("/", async (req, res) => {
    const { showtime, now } = req;
    const seat = await findSeatInAuditorium(db, showtime.auditorium_id, req.body.seat_id);

    try {
      const hold = await createHold(db, { showtime, seat, user: req.currentUser, now });
      await seatChanged({ ...deps, now }, showtime.id, seat.id);
      res.status(201).json({ expires_at: hold.expires_at, remaining_seconds: remainingSeconds(hold, now) });
    } catch (error) {
      if (error instanceof RecordNotUnique) {
        res.status(409).json({ error: "Dieser Platz wurde gerade von jemand anderem reserviert." });
      } else if (error instanceof RecordInvalid) {
        res.status(422).json({ error: toSentence(error.errors.fullMessages()) });
      } else {
        throw error;
      }
    }
  });

  router.delete("/:seatId", async (req, res) => {
    const hold = await findOwnHold(db, req.showtime.id, req.params.seatId, req.currentUser.id);
    if (!hold) {
      res.sendStatus(404);
      return;
    }

    await deleteHold(db, hold);
    await seatChanged({ ...deps, now: req.now }, req.showtime.id, hold.seat_id);
    res.sendStatus(204);
  });

  return router;
}
