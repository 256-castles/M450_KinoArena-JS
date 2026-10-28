import { DateTime } from "luxon";

// Entspricht config.time_zone = "Europe/Zurich" im Original.
export const TIME_ZONE = "Europe/Zurich";

export const MINUTE_MS = 60 * 1000;

export function inZone(date) {
  return DateTime.fromJSDate(date, { zone: TIME_ZONE });
}

// "03.11.2026 19:00"
export function formatDateTime(date) {
  return inZone(date).toFormat("dd.MM.yyyy HH:mm");
}

// Beginn des heutigen Tages in Zuerich (Time.zone.now.beginning_of_day)
export function startOfDay(date) {
  return inZone(date).startOf("day").toJSDate();
}

// Formularwerte wie "2026-11-03T19:00" (datetime-local) werden – wie in Rails –
// als Zuercher Ortszeit interpretiert. Werte mit Zeitzone/Offset bleiben unveraendert.
export function parseDateTime(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" || value.trim() === "") return null;

  const text = value.trim();
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(text);
  const parsed = hasOffset ? DateTime.fromISO(text, { setZone: true }) : DateTime.fromISO(text, { zone: TIME_ZONE });
  return parsed.isValid ? parsed.toJSDate() : null;
}
