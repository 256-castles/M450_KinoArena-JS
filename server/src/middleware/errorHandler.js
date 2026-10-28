import {
  NotAuthorizedError,
  ParameterMissing,
  RecordInvalid,
  RecordNotFound,
  StaleObjectError
} from "../errors.js";

export const NOT_AUTHORIZED_MESSAGE = "Zugriff verweigert. Du hast keine Berechtigung für diese Seite.";
export const STALE_OBJECT_MESSAGE =
  "Die Daten wurden zwischenzeitlich von jemand anderem geaendert. Bitte pruefe die aktuellen Werte und speichere erneut.";

// Entspricht den rescue_from-Handlern in ApplicationController und Admin::BaseController.
export function errorHandler() {
  // Express erkennt Fehler-Middleware an den vier Parametern.
  return async (error, req, res, _next) => {
    if (error instanceof NotAuthorizedError) {
      res.status(403).json({ alert: NOT_AUTHORIZED_MESSAGE });
      return;
    }

    if (error instanceof RecordNotFound) {
      await req.logActivity?.("record_not_found", {
        description: `Aufruf einer nicht existierenden Ressource: ${req.originalUrl.split("?")[0]}`
      });
      res.status(404).json({ alert: "Diese Seite gibt es nicht", not_found: true });
      return;
    }

    if (error instanceof RecordInvalid) {
      res.status(422).json(error.errors.toJSON());
      return;
    }

    // NFA-2: zweiter Admin wird gewarnt statt fremde Aenderungen zu ueberschreiben
    if (error instanceof StaleObjectError) {
      await req.logActivity?.("stale_object_conflict", {
        description: `Optimistic-Locking-Konflikt in ${error.table}`
      });
      res.status(409).json({ alert: STALE_OBJECT_MESSAGE });
      return;
    }

    if (error instanceof ParameterMissing || error.type === "entity.parse.failed") {
      res.status(400).json({ alert: "Ungültige Anfrage." });
      return;
    }

    console.error(error);
    res.status(500).json({ alert: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut." });
  };
}
