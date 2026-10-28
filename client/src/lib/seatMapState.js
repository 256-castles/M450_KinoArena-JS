// Reine Hilfsfunktionen des Saalplans (aus seat_map_controller.js des Originals).

export const FREE_CLASSES = [
  "bg-slate-600", "ring-1", "ring-inset", "ring-white/20",
  "hover:bg-slate-500", "hover:ring-brand-400", "cursor-pointer"
];
export const MINE_CLASSES = ["bg-brand-500", "ring-1", "ring-inset", "ring-brand-400", "cursor-pointer"];
export const OTHER_CLASSES = ["bg-gold-400", "ring-1", "ring-inset", "ring-gold-400", "cursor-not-allowed"];

// "booked" | "free" | "mine" | "other"
export function stateOf(seat, currentUserId) {
  if (seat.booked) return "booked";
  if (!seat.holder_id) return "free";
  return currentUserId && seat.holder_id === currentUserId ? "mine" : "other";
}

export function classesFor(state) {
  if (state === "mine") return MINE_CLASSES;
  if (state === "other") return OTHER_CLASSES;
  return FREE_CLASSES;
}

export function seatTitle(seat, state) {
  if (state === "mine") return `Platz ${seat.label} – deine Reservierung`;
  if (state === "other") return `Platz ${seat.label} wird gerade von einer anderen Person gebucht`;
  return `Platz ${seat.label} ist frei`;
}

export function mySeats(seats, currentUserId) {
  return seats.filter((seat) => stateOf(seat, currentUserId) === "mine");
}

export function formatPrice(value) {
  return `CHF ${Number(value).toFixed(2)}`;
}

// 290 -> "04:50"
export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

// Fruehester Ablauf der eigenen Reservierungen in Millisekunden (oder null)
export function earliestExpiry(seats) {
  const times = seats.map((seat) => new Date(seat.expires_at).getTime()).filter((time) => !Number.isNaN(time));
  return times.length > 0 ? Math.min(...times) : null;
}

export function remainingSeconds(expiresAtMs, nowMs) {
  return Math.max(0, Math.round((expiresAtMs - nowMs) / 1000));
}

export function submitLabel(count) {
  return count > 0 ? `${count} Ticket${count > 1 ? "s" : ""} buchen` : "Bitte Sitzplätze wählen";
}

// Sitze nach Reihe gruppiert (Reihenfolge der Sitze bleibt erhalten)
export function groupByRow(seats) {
  const rows = new Map();
  for (const seat of seats) {
    if (!rows.has(seat.row)) rows.set(seat.row, []);
    rows.get(seat.row).push(seat);
  }
  return [...rows];
}

export function seatNumbers(seats) {
  return [...new Set(seats.map((seat) => seat.number))].sort((a, b) => a - b);
}

// Wendet ein Live-Update (Server-Sent Event) auf die Sitzliste an
export function applySeatUpdate(seats, update) {
  return seats.map((seat) =>
    seat.id === update.seat_id
      ? { ...seat, booked: update.booked, holder_id: update.holder_id, expires_at: update.expires_at }
      : seat
  );
}
