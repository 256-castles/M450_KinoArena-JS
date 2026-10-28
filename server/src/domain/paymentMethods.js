// Booking::PAYMENT_METHODS – die Zahlung selbst ist simuliert.
export const PAYMENT_METHODS = Object.freeze({
  apple_pay: "Apple Pay",
  credit_card: "Kreditkarte",
  twint: "TWINT"
});

export function isPaymentMethod(value) {
  return Object.hasOwn(PAYMENT_METHODS, value);
}

// Booking#payment_method_label
export function paymentMethodLabel(value) {
  return isPaymentMethod(value) ? PAYMENT_METHODS[value] : "Vor Ort";
}

// BookingsController#payment_method: unbekannte Werte werden zu null
export function normalizePaymentMethod(value) {
  return isPaymentMethod(value) ? value : null;
}
