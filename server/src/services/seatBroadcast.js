import { activeHold } from "../models/seatHolds.js";

// Verteilt Sitzplatz-Zustaende an alle Zuschauer einer Vorstellung.
// Ersetzt Turbo Streams/ActionCable des Originals; die Clients sind per
// Server-Sent Events verbunden (routes/showtimes.js).
export class SeatBroadcaster {
  constructor() {
    this.listeners = new Map();
  }

  subscribe(showtimeId, listener) {
    const key = String(showtimeId);
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(listener);

    return () => {
      const listeners = this.listeners.get(key);
      listeners?.delete(listener);
      if (listeners?.size === 0) this.listeners.delete(key);
    };
  }

  publish(showtimeId, event) {
    for (const listener of this.listeners.get(String(showtimeId)) ?? []) listener(event);
  }

  subscriberCount(showtimeId) {
    return this.listeners.get(String(showtimeId))?.size ?? 0;
  }
}

// Aktueller Zustand eines Platzes (entspricht den data-Attributen von _seat.html.erb)
export async function seatState(db, showtimeId, seatId, now) {
  const [booking, hold] = await Promise.all([
    db("bookings").where({ showtime_id: showtimeId, seat_id: seatId }).first("id"),
    activeHold(db, showtimeId, seatId, now)
  ]);
  return {
    seat_id: Number(seatId),
    booked: Boolean(booking),
    holder_id: hold?.user_id ?? null,
    expires_at: hold?.expires_at ?? null
  };
}

export async function seatChanged({ db, broadcaster, now }, showtimeId, seatId) {
  if (broadcaster.subscriberCount(showtimeId) === 0) return;
  broadcaster.publish(showtimeId, await seatState(db, showtimeId, seatId, now));
}

export async function seatsChanged(deps, showtimeId, seatIds) {
  for (const seatId of seatIds) await seatChanged(deps, showtimeId, seatId);
}
