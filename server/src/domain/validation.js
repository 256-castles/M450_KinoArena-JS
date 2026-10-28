// Nachbau von ActiveModel::Errors und den Standard-Validatoren.
// Texte und Attributnamen stammen aus config/locales/de.yml des Originals.

export const MESSAGES = {
  blank: "muss ausgefüllt werden",
  confirmation: (attribute) => `stimmt nicht mit ${attribute} überein`,
  greaterThan: (count) => `muss grösser als ${count} sein`,
  greaterThanOrEqualTo: (count) => `muss grösser oder gleich ${count} sein`,
  inclusion: "ist kein gültiger Wert",
  invalid: "ist nicht gültig",
  lessThanOrEqualTo: (count) => `muss kleiner oder gleich ${count} sein`,
  notANumber: "ist keine Zahl",
  notAnInteger: "muss eine ganze Zahl sein",
  taken: "ist bereits vergeben",
  tooLong: (count) => `ist zu lang (maximal ${count} Zeichen)`,
  tooShort: (count) => `ist zu kurz (mindestens ${count} Zeichen)`
};

export const ATTRIBUTE_NAMES = {
  user: {
    name: "Name",
    email_address: "E-Mail-Adresse",
    password: "Passwort",
    password_confirmation: "Passwortbestätigung",
    admin: "Administrator"
  },
  movie: {
    title: "Titel",
    description: "Beschreibung",
    duration_minutes: "Dauer",
    poster_url: "Poster-URL"
  },
  auditorium: {
    name: "Name",
    total_seats: "Sitzplätze",
    row_count: "Anzahl Reihen",
    seats_per_row: "Plätze pro Reihe"
  },
  showtime: {
    movie: "Film",
    movie_id: "Film",
    auditorium: "Saal",
    auditorium_id: "Saal",
    start_time: "Beginn",
    price: "Preis"
  },
  booking: {
    seat: "Sitzplatz",
    seat_id: "Sitzplatz",
    showtime: "Vorstellung",
    total_price: "Preis",
    qr_code_token: "QR-Code",
    payment_method: "Zahlungsmethode"
  },
  seat_hold: {
    seat: "Sitzplatz",
    expires_at: "Ablaufzeit"
  }
};

// Wie String#humanize in Rails: "seats_per_row" -> "Seats per row"
export function humanize(attribute) {
  const text = String(attribute).replace(/_id$/, "").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function humanAttributeName(model, attribute) {
  return ATTRIBUTE_NAMES[model]?.[attribute] ?? humanize(attribute);
}

export class Errors {
  constructor(model) {
    this.model = model;
    this.messages = new Map();
  }

  add(attribute, message) {
    if (!this.messages.has(attribute)) this.messages.set(attribute, []);
    this.messages.get(attribute).push(message);
    return this;
  }

  on(attribute) {
    return this.messages.get(attribute) ?? [];
  }

  get any() {
    return this.messages.size > 0;
  }

  get attributeNames() {
    return [...this.messages.keys()];
  }

  fullMessage(attribute, message) {
    if (attribute === "base") return message;
    return `${humanAttributeName(this.model, attribute)} ${message}`;
  }

  fullMessages() {
    return [...this.messages].flatMap(([attribute, messages]) =>
      messages.map((message) => this.fullMessage(attribute, message))
    );
  }

  toJSON() {
    return { errors: Object.fromEntries(this.messages), messages: this.fullMessages() };
  }
}

// Wie Array#to_sentence
export function toSentence(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} und ${items.at(-1)}`;
}

export function isBlank(value) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

const NUMBER_FORMAT = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const INTEGER_FORMAT = /^[+-]?\d+$/;

// Liefert die Zahl zu einem Formularwert oder NaN.
export function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || !NUMBER_FORMAT.test(value.trim())) return Number.NaN;
  return Number(value.trim());
}

// Wie Ruby String#to_i: "12abc" -> 12, "abc" -> 0
export function toInteger(value) {
  const number = Number.parseInt(value, 10);
  return Number.isNaN(number) ? 0 : number;
}

export function validatePresence(errors, attribute, value) {
  if (isBlank(value)) errors.add(attribute, MESSAGES.blank);
}

export function validateLength(errors, attribute, value, { minimum, maximum } = {}) {
  if (value === undefined || value === null) return;
  const length = String(value).length;
  if (maximum !== undefined && length > maximum) errors.add(attribute, MESSAGES.tooLong(maximum));
  if (minimum !== undefined && length < minimum) errors.add(attribute, MESSAGES.tooShort(minimum));
}

export function validateNumericality(
  errors,
  attribute,
  value,
  { onlyInteger = false, greaterThan, greaterThanOrEqualTo, lessThanOrEqualTo, allowNil = false } = {}
) {
  if (allowNil && isBlank(value)) return;

  const number = parseNumber(value);
  if (Number.isNaN(number)) {
    errors.add(attribute, MESSAGES.notANumber);
    return;
  }
  if (onlyInteger && !(Number.isInteger(number) && (typeof value === "number" || INTEGER_FORMAT.test(value.trim())))) {
    errors.add(attribute, MESSAGES.notAnInteger);
    return;
  }
  if (greaterThan !== undefined && !(number > greaterThan)) {
    errors.add(attribute, MESSAGES.greaterThan(greaterThan));
  }
  if (greaterThanOrEqualTo !== undefined && !(number >= greaterThanOrEqualTo)) {
    errors.add(attribute, MESSAGES.greaterThanOrEqualTo(greaterThanOrEqualTo));
  }
  if (lessThanOrEqualTo !== undefined && !(number <= lessThanOrEqualTo)) {
    errors.add(attribute, MESSAGES.lessThanOrEqualTo(lessThanOrEqualTo));
  }
}

export function validateFormat(errors, attribute, value, pattern, message = MESSAGES.invalid) {
  if (!pattern.test(String(value ?? ""))) errors.add(attribute, message);
}

// Uebernimmt nur die erlaubten Attribute (wie params.permit).
export function permit(params, attributes) {
  const source = params ?? {};
  return Object.fromEntries(attributes.filter((key) => key in source).map((key) => [key, source[key]]));
}
