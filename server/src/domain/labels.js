import { formatDateTime } from "./time.js";

// Darstellungshilfen aus den Modellen und Helpern des Originals.

// Movie#duration_label: 142 -> "2h 22m"
export function durationLabel(durationMinutes) {
  const minutes = Number(durationMinutes);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// Seat#label: "A12"
export function seatLabel(seat) {
  return `${seat.row}${seat.number}`;
}

// Showtime#label: "Dune – 03.11.2026 19:00"
export function showtimeLabel(movieTitle, startTime) {
  return `${movieTitle ?? ""} – ${startTime ? formatDateTime(startTime) : ""}`;
}

// ApplicationHelper#chf
export function chf(amount) {
  return `CHF ${Number(amount ?? 0).toFixed(2)}`;
}

// BookingsHelper#booking_reference: "KA-1A2B3C4D"
export function bookingReference(qrCodeToken) {
  return `KA-${String(qrCodeToken).replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

// User#role_name
export function roleName(user) {
  return user.admin ? "Administrator" : "Kunde";
}

// ActivityLog#actor_name
export function actorName(log) {
  return log.user_email_address || "Gast";
}

// ActivityLog#target_label
export function targetLabel(log) {
  if (!log.target_type) return "-";
  return `${log.target_type} #${log.target_id}`;
}
