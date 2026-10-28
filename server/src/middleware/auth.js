import { NotAuthorizedError } from "../errors.js";

export const LOGIN_REQUIRED_MESSAGE = "Bitte melde dich zuerst an.";

export function requireUser(req, res, next) {
  if (!req.currentUser) {
    res.status(401).json({ alert: LOGIN_REQUIRED_MESSAGE });
    return;
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    res.status(401).json({ alert: LOGIN_REQUIRED_MESSAGE });
    return;
  }
  if (!req.currentUser.admin) {
    next(new NotAuthorizedError("Admin", "access"));
    return;
  }
  next();
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF-Schutz (statt authenticity_token in Rails): Schreibende Anfragen muessen
// den Header X-Requested-With tragen. Fremde Seiten koennen ihn ohne CORS-Freigabe
// nicht setzen; zusaetzlich ist das Session-Cookie SameSite=Lax.
export function csrfGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method) || req.get("X-Requested-With") === "XMLHttpRequest") {
    next();
    return;
  }
  res.status(403).json({ alert: "Ungültige Anfrage. Bitte lade die Seite neu." });
}
