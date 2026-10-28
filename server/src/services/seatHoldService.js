import { releaseExpired } from "../models/seatHolds.js";
import { seatChanged } from "./seatBroadcast.js";

// SeatHold.release_expired!: gibt abgelaufene Reservierungen frei und meldet
// die Plaetze an alle Clients.
export async function releaseExpiredHolds({ db, broadcaster, now }) {
  return releaseExpired(db, {
    now,
    onReleased: (hold) => seatChanged({ db, broadcaster, now }, hold.showtime_id, hold.seat_id)
  });
}
