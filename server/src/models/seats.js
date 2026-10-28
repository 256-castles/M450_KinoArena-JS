import { RecordNotFound } from "../errors.js";
import { seatLabel } from "../domain/labels.js";

export function presentSeat(seat) {
  return { id: seat.id, row: seat.row, number: seat.number, label: seatLabel(seat) };
}

// scope :ordered
export async function listSeats(db, auditoriumId) {
  return db("seats").where({ auditorium_id: auditoriumId }).orderBy([{ column: "row" }, { column: "number" }]);
}

export async function seatsByIds(db, auditoriumId, seatIds) {
  return db("seats")
    .where({ auditorium_id: auditoriumId })
    .whereIn("id", seatIds)
    .orderBy([{ column: "row" }, { column: "number" }]);
}

export async function findSeatInAuditorium(db, auditoriumId, seatId) {
  const seat = await db("seats").where({ auditorium_id: auditoriumId, id: seatId }).first();
  if (!seat) throw new RecordNotFound("Seat", seatId);
  return seat;
}
