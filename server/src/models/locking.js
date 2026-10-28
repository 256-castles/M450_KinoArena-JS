import { StaleObjectError } from "../errors.js";
import { parseNumber } from "../domain/validation.js";

// NFA-2: Optimistic Locking wie ActiveRecord (lock_version).
// Das Formular sendet die beim Laden gelesene lock_version mit. Stimmt sie beim
// Speichern nicht mehr mit der Datenbank ueberein, hat jemand anderes den
// Datensatz zwischenzeitlich geaendert – statt fremde Aenderungen still zu
// ueberschreiben, wird StaleObjectError geworfen.

export function submittedLockVersion(params, record) {
  const value = parseNumber(params?.lock_version);
  return Number.isInteger(value) ? value : record.lock_version;
}

export async function updateWithLock(db, table, id, lockVersion, changes) {
  const updated = await db(table)
    .where({ id, lock_version: lockVersion })
    .update({ ...changes, lock_version: db.raw("lock_version + 1") });

  if (updated === 0) throw new StaleObjectError(table, id);
  return lockVersion + 1;
}
