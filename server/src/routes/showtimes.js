import { Router } from "express";
import { activeHolds, HOLD_DURATION_MS } from "../models/seatHolds.js";
import { listSeats, presentSeat } from "../models/seats.js";
import { findShowtime, findShowtimeDetailed, upcomingProgramme } from "../models/showtimes.js";
import { releaseExpiredHolds } from "../services/seatHoldService.js";

const HEARTBEAT_MS = 25_000;

// FA-2/FA-3: Spielplan und Saalplan (ShowtimesController)
export function showtimesRouter(deps) {
  const { db, broadcaster } = deps;
  const router = Router();

  router.get("/", async (req, res) => {
    res.json(await upcomingProgramme(db, req.now));
  });

  router.get("/:id", async (req, res) => {
    const showtime = await findShowtimeDetailed(db, req.params.id);
    await releaseExpiredHolds({ ...deps, now: req.now });

    const [seats, bookedSeatIds, holds] = await Promise.all([
      listSeats(db, showtime.auditorium_id),
      db("bookings").where({ showtime_id: showtime.id }).pluck("seat_id"),
      activeHolds(db, showtime.id, req.now)
    ]);
    const booked = new Set(bookedSeatIds);
    const holdsBySeatId = new Map(holds.map((hold) => [hold.seat_id, hold]));

    res.json({
      showtime,
      hold_duration_minutes: HOLD_DURATION_MS / 60_000,
      seats: seats.map((seat) => {
        const hold = holdsBySeatId.get(seat.id);
        return {
          ...presentSeat(seat),
          booked: booked.has(seat.id),
          holder_id: hold?.user_id ?? null,
          expires_at: hold?.expires_at ?? null
        };
      })
    });
  });

  // Live-Updates des Saalplans per Server-Sent Events (ersetzt turbo_stream_from)
  router.get("/:id/seats/stream", async (req, res) => {
    const showtime = await findShowtime(db, req.params.id);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write("retry: 3000\n\n");

    const unsubscribe = broadcaster.subscribe(showtime.id, (event) => {
      res.write(`event: seat\ndata: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  return router;
}
