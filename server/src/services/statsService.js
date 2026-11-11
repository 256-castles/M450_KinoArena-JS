// Auslastungsstatistik ueber alle Vorstellungen (M450 LB1 / Teil 4, TDD).
// Die Kennzahlen entstehen in zwei Schritten: eine Aggregat-Abfrage liefert je
// Vorstellung Buchungen und Saalgroesse, die Auswertung selbst ist reine Logik.

// Kennzahlen auf vier Nachkommastellen, damit Gleitkomma-Reste nicht durchschlagen.
const PRECISION = 10_000;

const EMPTY_STATS = Object.freeze({ showtimeCount: 0, average: 0, median: 0, min: 0, max: 0 });

function round(value) {
    return Math.round(value * PRECISION) / PRECISION;
}

export function occupancyRate(bookedSeats, totalSeats) {
    const booked = Number(bookedSeats);
    const total = Number(totalSeats);
    if (!Number.isFinite(booked) || !Number.isFinite(total) || total <= 0) return 0;
    return round(Math.min(booked / total, 1));
}

function median(sortedRates) {
    const middle = Math.floor(sortedRates.length / 2);
    if (sortedRates.length % 2 === 1) return sortedRates[middle];
    return round((sortedRates[middle - 1] + sortedRates[middle]) / 2);
}

export function summarizeOccupancy(rows) {
    const rates = rows.map((row) => occupancyRate(row.booked_seats, row.total_seats)).sort((a, b) => a - b);
    if (rates.length === 0) return { ...EMPTY_STATS };

    const sum = rates.reduce((total, rate) => total + rate, 0);
    return {
        showtimeCount: rates.length,
        average: round(sum / rates.length),
        median: median(rates),
        min: rates[0],
        max: rates.at(-1)
    };
}

export async function occupancyStats(db) {
    const rows = await db("showtimes")
        .join("auditoria", "auditoria.id", "showtimes.auditorium_id")
        .leftJoin("bookings", "bookings.showtime_id", "showtimes.id")
        .groupBy("showtimes.id", "auditoria.total_seats")
        .select("showtimes.id as showtime_id", "auditoria.total_seats")
        .count("bookings.id as booked_seats");

    return summarizeOccupancy(rows);
}

export async function averageOccupancy(db) {
    return (await occupancyStats(db)).average;
}
