import { ParameterMissing } from "../errors.js";
import { recordActivity } from "../models/activityLogs.js";
import { findUser } from "../models/users.js";

// Pro Anfrage: aktuelle Zeit, angemeldeter Benutzer und Protokollierung
// (entspricht current_user und log_activity im ApplicationController).
export function requestContext({ db, clock }) {
  return async (req, _res, next) => {
    req.now = clock.now();

    const userId = req.session?.userId;
    req.currentUser = userId ? await findUser(db, userId) : null;
    if (userId && !req.currentUser) req.session = null;

    req.logActivity = (action, { target = null, description = null, userId: actorId } = {}) =>
      recordActivity(db, {
        action,
        userId: actorId === undefined ? (req.currentUser?.id ?? null) : actorId,
        target,
        description,
        ipAddress: req.ip,
        now: req.now
      });

    next();
  };
}

// Meldet den Benutzer an und ersetzt dabei die bisherige Session (reset_session).
export function signIn(req, user) {
  req.session = { userId: user.id };
  req.currentUser = user;
}

export function signOut(req) {
  req.session = null;
  req.currentUser = null;
}

// params.require(:key)
export function requireParams(body, key) {
  const value = body?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ParameterMissing(key);
  return value;
}

export function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
