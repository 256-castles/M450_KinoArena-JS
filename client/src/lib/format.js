// Formatierung wie in den Helpern und der Locale-Datei (config/locales/de.yml)
// des Originals. Angezeigt wird immer in der Zeitzone Europe/Zurich.

export const TIME_ZONE = "Europe/Zurich";

const ABBR_DAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const ABBR_MONTH_NAMES = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23"
});

const pad = (value) => String(value).padStart(2, "0");

// Datum/Zeit-Bestandteile in Zuercher Ortszeit
export function zonedParts(value) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(new Date(value)).map(({ type, value: part }) => [type, part])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS[parts.weekday]
  };
}

// ApplicationHelper#showtime_date: "Mi., 28. Okt. 2026"
export function showtimeDate(value) {
  const { year, month, day, weekday } = zonedParts(value);
  return `${ABBR_DAY_NAMES[weekday]}., ${day}. ${ABBR_MONTH_NAMES[month - 1]} ${year}`;
}

// strftime("%H:%M")
export function timeOfDay(value) {
  const { hour, minute } = zonedParts(value);
  return `${pad(hour)}:${pad(minute)}`;
}

// l(date): "28.10.2026"
export function dateLabel(value) {
  const { year, month, day } = zonedParts(value);
  return `${pad(day)}.${pad(month)}.${year}`;
}

// l(time, format: :short): "28. Oktober, 19:30 Uhr"
export function shortDateTime(value) {
  const { month, day, hour, minute } = zonedParts(value);
  return `${pad(day)}. ${MONTH_NAMES[month - 1]}, ${pad(hour)}:${pad(minute)} Uhr`;
}

// strftime("%d.%m.%Y %H:%M:%S")
export function timestamp(value) {
  const { second } = zonedParts(value);
  return `${dateLabel(value)} ${timeOfDay(value)}:${pad(second)}`;
}

// Kalendertag als Schluessel zum Gruppieren: "2026-10-28"
export function dateKey(value) {
  const { year, month, day } = zonedParts(value);
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Wert fuer <input type="datetime-local"> in Zuercher Ortszeit
export function dateTimeLocalValue(value) {
  if (!value) return "";
  const { hour, minute } = zonedParts(value);
  return `${dateKey(value)}T${pad(hour)}:${pad(minute)}`;
}

// ApplicationHelper#chf
export function chf(amount) {
  return `CHF ${Number(amount ?? 0).toFixed(2)}`;
}

// pluralize(2, "Vorstellung", plural: "Vorstellungen")
export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function isFuture(value, now = Date.now()) {
  return new Date(value).getTime() > now;
}
