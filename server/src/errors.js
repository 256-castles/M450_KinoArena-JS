// Fehlerklassen nach dem Vorbild von ActiveRecord und Pundit.
// Der zentrale errorHandler (middleware/errorHandler.js) uebersetzt sie in HTTP-Antworten.

export class RecordNotFound extends Error {
  constructor(model, id) {
    super(`${model} mit id=${id} nicht gefunden`);
    this.name = "RecordNotFound";
    this.model = model;
    this.id = id;
  }
}

// Traegt ein Errors-Objekt (domain/validation.js) mit den Validierungsfehlern.
export class RecordInvalid extends Error {
  constructor(errors) {
    super(errors.fullMessages().join(", "));
    this.name = "RecordInvalid";
    this.errors = errors;
  }
}

// Verletzung eines Unique-Index in der Datenbank (ER_DUP_ENTRY).
export class RecordNotUnique extends Error {
  constructor(cause) {
    super(cause?.message ?? "Eindeutigkeit verletzt");
    this.name = "RecordNotUnique";
    this.cause = cause;
  }
}

// NFA-2: Optimistic Locking – der Datensatz wurde zwischenzeitlich geaendert.
export class StaleObjectError extends Error {
  constructor(table, id) {
    super(`${table} #${id} wurde zwischenzeitlich geaendert`);
    this.name = "StaleObjectError";
    this.table = table;
    this.id = id;
  }
}

// Wie ActionController::ParameterMissing bei params.require(:movie)
export class ParameterMissing extends Error {
  constructor(key) {
    super(`Parameter fehlt: ${key}`);
    this.name = "ParameterMissing";
    this.key = key;
  }
}

export class NotAuthorizedError extends Error {
  constructor(policy, action) {
    super(`nicht berechtigt: ${policy}#${action}`);
    this.name = "NotAuthorizedError";
  }
}

const DUPLICATE_ENTRY = 1062;

export function isDuplicateEntry(error) {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === DUPLICATE_ENTRY;
}

// Fuehrt fn aus und uebersetzt eine Unique-Verletzung der Datenbank in RecordNotUnique.
export async function translateDuplicate(fn) {
  try {
    return await fn();
  } catch (error) {
    if (isDuplicateEntry(error)) throw new RecordNotUnique(error);
    throw error;
  }
}
