import bcrypt from "bcryptjs";
import { RecordInvalid, RecordNotFound, isDuplicateEntry } from "../errors.js";
import { roleName } from "../domain/labels.js";
import {
  generatePasswordResetToken,
  passwordFingerprint,
  verifyPasswordResetToken
} from "../domain/passwordResetToken.js";
import { Errors, MESSAGES, validateFormat, validateLength, validatePresence } from "../domain/validation.js";

export const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const NAME_MAX_LENGTH = 60;
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt verarbeitet hoechstens 72 Bytes (wie has_secure_password)
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_RESET_COOLDOWN_MS = 2 * 60 * 1000;

const BCRYPT_COST = process.env.NODE_ENV === "test" ? 4 : 12;

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function toBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

// has_secure_password ignoriert ein leeres Passwort stillschweigend
function presentPassword(value) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export function validateUser(attrs, { isNew, emailTaken = false, wasAdmin = false, otherAdminsExist = true }) {
  const errors = new Errors("user");

  if (isNew && attrs.password === undefined) errors.add("password", MESSAGES.blank);
  if (attrs.password !== undefined) {
    if (Buffer.byteLength(attrs.password) > PASSWORD_MAX_BYTES) errors.add("password", MESSAGES.tooLong(PASSWORD_MAX_BYTES));
    if (attrs.password_confirmation !== undefined && attrs.password_confirmation !== null &&
        attrs.password_confirmation !== attrs.password) {
      errors.add("password_confirmation", MESSAGES.confirmation("Passwort"));
    }
  }

  validatePresence(errors, "email_address", attrs.email_address);
  if (emailTaken) errors.add("email_address", MESSAGES.taken);
  validateFormat(errors, "email_address", attrs.email_address, EMAIL_FORMAT, "ist keine gültige E-Mail-Adresse");

  validatePresence(errors, "name", attrs.name);
  validateLength(errors, "name", attrs.name, { maximum: NAME_MAX_LENGTH });

  validateLength(errors, "password", attrs.password, { minimum: PASSWORD_MIN_LENGTH });

  // Ohne diese Pruefung koennte sich der einzige Administrator selbst zum
  // Kunden herabstufen und der Admin-Bereich waere fuer niemanden mehr erreichbar.
  if (!isNew && wasAdmin && !attrs.admin && !otherAdminsExist) {
    errors.add("admin", "darf nicht entzogen werden – es muss mindestens ein Administrator bleiben");
  }

  return errors;
}

function fromRow(row) {
  return row ? { ...row, admin: Boolean(row.admin) } : null;
}

// Was das Frontend ueber einen Benutzer erfahren darf (ohne Passwort-Hash)
export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email_address: user.email_address,
    admin: user.admin,
    role_name: roleName(user),
    created_at: user.created_at
  };
}

export async function findUser(db, id) {
  return fromRow(await db("users").where({ id }).first());
}

export async function findUserOrFail(db, id) {
  const user = await findUser(db, id);
  if (!user) throw new RecordNotFound("User", id);
  return user;
}

export async function findUserByEmail(db, emailAddress) {
  return fromRow(await db("users").where({ email_address: normalizeEmail(emailAddress) }).first());
}

async function emailTaken(db, emailAddress, exceptId = null) {
  const query = db("users").whereRaw("LOWER(email_address) = ?", [emailAddress]);
  if (exceptId) query.whereNot({ id: exceptId });
  return Boolean(await query.first("id"));
}

export async function adminCount(db) {
  const row = await db("users").where({ admin: true }).count({ count: "*" }).first();
  return Number(row.count);
}

async function otherAdminsExist(db, userId) {
  return Boolean(await db("users").where({ admin: true }).whereNot({ id: userId }).first("id"));
}

export async function authenticate(user, password) {
  if (!user || typeof password !== "string" || password === "") return false;
  return bcrypt.compare(password, user.password_digest);
}

function rejectDuplicateEmail(error) {
  if (isDuplicateEntry(error)) throw new RecordInvalid(new Errors("user").add("email_address", MESSAGES.taken));
  throw error;
}

export async function createUser(db, params, { now }) {
  const attrs = {
    name: params.name,
    email_address: normalizeEmail(params.email_address),
    password: presentPassword(params.password),
    password_confirmation: params.password_confirmation,
    admin: toBoolean(params.admin)
  };

  const errors = validateUser(attrs, { isNew: true, emailTaken: await emailTaken(db, attrs.email_address) });
  if (errors.any) throw new RecordInvalid(errors);

  const passwordDigest = await bcrypt.hash(attrs.password, BCRYPT_COST);
  try {
    const [id] = await db("users").insert({
      name: attrs.name,
      email_address: attrs.email_address,
      admin: attrs.admin,
      password_digest: passwordDigest,
      created_at: now,
      updated_at: now
    });
    return findUser(db, id);
  } catch (error) {
    return rejectDuplicateEmail(error);
  }
}

export async function updateUser(db, user, params, { now }) {
  const changes = {};
  if ("name" in params) changes.name = params.name;
  if ("email_address" in params) changes.email_address = normalizeEmail(params.email_address);
  if ("admin" in params) changes.admin = toBoolean(params.admin);

  const attrs = {
    name: changes.name ?? user.name,
    email_address: changes.email_address ?? user.email_address,
    admin: changes.admin ?? user.admin,
    password: presentPassword(params.password),
    password_confirmation: params.password_confirmation
  };

  const errors = validateUser(attrs, {
    isNew: false,
    emailTaken: await emailTaken(db, attrs.email_address, user.id),
    wasAdmin: user.admin,
    otherAdminsExist: user.admin && !attrs.admin ? await otherAdminsExist(db, user.id) : true
  });
  if (errors.any) throw new RecordInvalid(errors);

  if (attrs.password !== undefined) changes.password_digest = await bcrypt.hash(attrs.password, BCRYPT_COST);

  try {
    await db("users").where({ id: user.id }).update({ ...changes, updated_at: now });
  } catch (error) {
    rejectDuplicateEmail(error);
  }
  return findUser(db, user.id);
}

export async function deleteUser(db, user) {
  // Buchungen und Reservierungen werden per Fremdschluessel mitgeloescht,
  // Protokolleintraege behalten (user_id wird NULL).
  await db("users").where({ id: user.id }).del();
}

export async function listUsersWithBookingCounts(db) {
  const rows = await db("users")
    .select("users.*")
    .select(db("bookings").count("*").whereRaw("bookings.user_id = users.id").as("bookings_count"))
    .orderBy("email_address");
  return rows.map((row) => ({ ...publicUser(fromRow(row)), bookings_count: Number(row.bookings_count) }));
}

// Verhindert, dass durch wiederholtes Absenden des Formulars beliebig viele
// gueltige Reset-Links erzeugt werden.
export function passwordResetThrottled(user, now) {
  return Boolean(user.password_reset_sent_at) &&
    user.password_reset_sent_at.getTime() > now.getTime() - PASSWORD_RESET_COOLDOWN_MS;
}

export async function startPasswordReset(db, user, { now, secret }) {
  await db("users").where({ id: user.id }).update({ password_reset_sent_at: now });
  return generatePasswordResetToken({ userId: user.id, passwordDigest: user.password_digest, now, secret });
}

export async function clearPasswordResetSentAt(db, user) {
  await db("users").where({ id: user.id }).update({ password_reset_sent_at: null });
}

// Abgelaufen oder bereits benutzt (Passwort geaendert) liefert null.
export async function findUserByPasswordResetToken(db, token, { now, secret }) {
  const claims = verifyPasswordResetToken(token, { now, secret });
  if (!claims) return null;

  const user = await findUser(db, claims.userId);
  if (!user || passwordFingerprint(user.password_digest) !== claims.fingerprint) return null;
  return user;
}
