export const MAX_ROWS = 26;
export const MAX_SEATS_PER_ROW = 40;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Reihenbezeichnungen A, B, C, …
// Das Original nutzte ("A"..."Z").first(n); der exklusive Bereich endet bei Y,
// womit ein Saal mit 26 Reihen nur 25 Reihen erhielt. Hier sind es A bis Z.
export function rowLetters(rowCount) {
  return ALPHABET.slice(0, Math.max(0, rowCount)).split("");
}

// Saalplan aus Reihen und Plaetzen pro Reihe (Auditorium#generate_seats)
export function buildSeatPlan(rowCount, seatsPerRow) {
  return rowLetters(rowCount).flatMap((row) =>
    Array.from({ length: Math.max(0, seatsPerRow) }, (_, index) => ({ row, number: index + 1 }))
  );
}
