import { RecordInvalid, RecordNotFound } from "../errors.js";
import { MAX_ROWS, MAX_SEATS_PER_ROW, buildSeatPlan } from "../domain/seatRows.js";
import {
  Errors,
  MESSAGES,
  isBlank,
  toInteger,
  validateNumericality,
  validatePresence
} from "../domain/validation.js";

// row_count und seats_per_row sind virtuelle Felder: aus ihnen wird der
// Saalplan beim Anlegen erzeugt. Danach kann der Saal nur umbenannt werden.
export function validateAuditorium(attrs, { isNew, nameTaken = false }) {
  const errors = new Errors("auditorium");
  validatePresence(errors, "name", attrs.name);
  if (nameTaken) errors.add("name", MESSAGES.taken);
  validatePresence(errors, "total_seats", attrs.total_seats);
  validateNumericality(errors, "total_seats", attrs.total_seats, { onlyInteger: true, greaterThan: 0 });

  if (isNew) {
    validateNumericality(errors, "row_count", attrs.row_count, {
      onlyInteger: true,
      greaterThan: 0,
      lessThanOrEqualTo: MAX_ROWS
    });
    validateNumericality(errors, "seats_per_row", attrs.seats_per_row, {
      onlyInteger: true,
      greaterThan: 0,
      lessThanOrEqualTo: MAX_SEATS_PER_ROW
    });
  }
  return errors;
}

// before_validation :derive_total_seats, on: :create
export function deriveTotalSeats(rowCount, seatsPerRow) {
  if (isBlank(rowCount) || isBlank(seatsPerRow)) return null;
  return toInteger(rowCount) * toInteger(seatsPerRow);
}

// Die Eindeutigkeit des Saalnamens ist bewusst nur hier geprueft: Saele werden
// ausschliesslich von Administratoren angelegt, ein Wettlauf ist nicht zu erwarten.
async function nameTaken(db, name, exceptId = null) {
  if (isBlank(name)) return false;
  const query = db("auditoria").whereRaw("LOWER(name) = ?", [String(name).toLowerCase()]);
  if (exceptId) query.whereNot({ id: exceptId });
  return Boolean(await query.first("id"));
}

function withStatistics(db, query) {
  return query
    .select("auditoria.*")
    .select(db("seats").count("*").whereRaw("seats.auditorium_id = auditoria.id").as("seats_count"))
    .select(db("showtimes").count("*").whereRaw("showtimes.auditorium_id = auditoria.id").as("showtimes_count"))
    .select(
      db("bookings")
        .count("*")
        .join("seats", "seats.id", "bookings.seat_id")
        .whereRaw("seats.auditorium_id = auditoria.id")
        .as("booked_seat_count")
    )
    .select(
      db.raw(
        "(SELECT GROUP_CONCAT(DISTINCT seats.`row` ORDER BY seats.`row` SEPARATOR ',') " +
          "FROM seats WHERE seats.auditorium_id = auditoria.id) AS row_list"
      )
    );
}

function present(row) {
  const { row_list: rowList, ...auditorium } = row;
  return {
    ...auditorium,
    rows: rowList ? rowList.split(",") : [],
    seats_count: Number(row.seats_count),
    showtimes_count: Number(row.showtimes_count),
    booked_seat_count: Number(row.booked_seat_count)
  };
}

export async function listAuditoria(db) {
  return (await withStatistics(db, db("auditoria")).orderBy("name")).map(present);
}

export async function findAuditorium(db, id) {
  const row = await withStatistics(db, db("auditoria")).where("auditoria.id", id).first();
  if (!row) throw new RecordNotFound("Auditorium", id);
  return present(row);
}

export async function createAuditorium(db, params, { now }) {
  const attrs = {
    name: params.name,
    row_count: params.row_count,
    seats_per_row: params.seats_per_row,
    total_seats: deriveTotalSeats(params.row_count, params.seats_per_row)
  };

  const errors = validateAuditorium(attrs, { isNew: true, nameTaken: await nameTaken(db, attrs.name) });
  if (errors.any) throw new RecordInvalid(errors);

  // Saal und Saalplan entstehen gemeinsam oder gar nicht.
  const id = await db.transaction(async (trx) => {
    const [auditoriumId] = await trx("auditoria").insert({
      name: attrs.name,
      total_seats: attrs.total_seats,
      created_at: now,
      updated_at: now
    });
    const seats = buildSeatPlan(toInteger(attrs.row_count), toInteger(attrs.seats_per_row)).map((seat) => ({
      ...seat,
      auditorium_id: auditoriumId,
      created_at: now,
      updated_at: now
    }));
    await trx("seats").insert(seats);
    return auditoriumId;
  });

  return findAuditorium(db, id);
}

// Der Saalplan bleibt unveraendert, damit bestehende Buchungen gueltig bleiben.
export async function renameAuditorium(db, auditorium, params, { now }) {
  const attrs = { ...auditorium, name: params.name ?? auditorium.name };
  const errors = validateAuditorium(attrs, {
    isNew: false,
    nameTaken: await nameTaken(db, attrs.name, auditorium.id)
  });
  if (errors.any) throw new RecordInvalid(errors);

  await db("auditoria").where({ id: auditorium.id }).update({ name: attrs.name, updated_at: now });
  return findAuditorium(db, auditorium.id);
}

// has_many :showtimes, dependent: :restrict_with_error
export async function deleteAuditorium(db, auditorium) {
  if (await db("showtimes").where({ auditorium_id: auditorium.id }).first("id")) return false;
  await db("auditoria").where({ id: auditorium.id }).del();
  return true;
}

export async function listAuditoriumOptions(db) {
  return db("auditoria").select("id", "name").orderBy("name");
}
