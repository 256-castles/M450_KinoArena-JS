import { createHmac, timingSafeEqual } from "node:crypto";

// Ersatz fuer generates_token_for :password_reset im Original.
// Der Token ist mit TOKEN_SECRET signiert und enthaelt einen Fingerabdruck des
// Passwort-Hashes. Damit verfaellt er nach Ablauf der Gueltigkeit und automatisch,
// sobald das Passwort geaendert wurde – ohne eigene Tokentabelle.

export const PURPOSE = "password_reset";
export const PASSWORD_RESET_VALIDITY_MS = 15 * 60 * 1000;

// Entspricht password_salt.last(10): Ein bcrypt-Hash beginnt mit "$2b$12$" und
// dem 22 Zeichen langen Salt; zusammen die ersten 29 Zeichen.
export function passwordFingerprint(passwordDigest) {
  return String(passwordDigest ?? "").slice(0, 29).slice(-10);
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function generatePasswordResetToken({ userId, passwordDigest, now, secret, validityMs = PASSWORD_RESET_VALIDITY_MS }) {
  const claims = { p: PURPOSE, id: userId, exp: now.getTime() + validityMs, fp: passwordFingerprint(passwordDigest) };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

// Liefert { userId, fingerprint } bei gueltiger Signatur und Laufzeit, sonst null.
// Ob der Fingerabdruck noch zum aktuellen Passwort passt, prueft der Aufrufer.
export function verifyPasswordResetToken(token, { now, secret }) {
  const [payload, signature, ...rest] = String(token ?? "").split(".");
  if (!payload || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (claims?.p !== PURPOSE || typeof claims.exp !== "number") return null;
  if (now.getTime() > claims.exp) return null;

  return { userId: claims.id, fingerprint: claims.fp };
}
