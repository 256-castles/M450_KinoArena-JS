import { beforeEach, describe, expect, it, vi } from "vitest";

import { RecordInvalid, RecordNotFound } from "../errors.js";

// M450 LB1 / Teil 1: Unit-Test mit Mocking.
// Alle Abhaengigkeiten der Unit sind ersetzt – weder Datenbank, Modelle noch
// der Broadcast werden echt aufgerufen. Geprueft wird ausschliesslich die
// Koordinationslogik von createBookings.
vi.mock("../models/bookings.js", () => ({
    buildBooking: vi.fn(),
    insertBooking: vi.fn()
}));
vi.mock("../models/seatHolds.js", () => ({
    activeHolds: vi.fn(),
    deleteHoldsForSeats: vi.fn()
}));
vi.mock("../models/seats.js", () => ({
    seatsByIds: vi.fn()
}));
vi.mock("./seatBroadcast.js", () => ({
    seatsChanged: vi.fn()
}));
vi.mock("../domain/labels.js", () => ({
    seatLabel: vi.fn()
}));

const { buildBooking, insertBooking } = await import("../models/bookings.js");
const { activeHolds, deleteHoldsForSeats } = await import("../models/seatHolds.js");
const { seatsByIds } = await import("../models/seats.js");
const { seatsChanged } = await import("./seatBroadcast.js");
const { seatLabel } = await import("../domain/labels.js");
const { createBookings } = await import("./bookingService.js");


const USER = { id: 7 };
const OTHER_USER_ID = 8;
const NOW = new Date("2026-11-04T18:00:00.000Z");
const BROADCASTER = { name: "broadcaster-stub" };

const SHOWTIME = { id: 42, auditorium_id: 3 };
// Ein zweiter Datensatz deckt auf, wenn die Where-Bedingung nicht greift.
const OTHER_SHOWTIME = { id: 41, auditorium_id: 9 };

const SEAT_A1 = { id: 101, row: "A", number: 1 };
const SEAT_A2 = { id: 102, row: "A", number: 2 };

// Minimaler Knex-Ersatz: filtert wie die echte Query, ohne Datenbank.
function createDb({ showtimes = [OTHER_SHOWTIME, SHOWTIME] } = {}) {
    const spy = { tables: [], conditions: [], forUpdate: false };

    const trx = vi.fn((table) => {
        spy.tables.push(table);
        let rows = table === "showtimes" ? [...showtimes] : [];

        const builder = {
            where(conditions) {
                spy.conditions.push(conditions);
                rows = rows.filter((row) => Object.entries(conditions).every(([column, value]) => row[column] === value));
                return builder;
            },
            forUpdate() {
                spy.forUpdate = true;
                return builder;
            },
            async first() {
                return rows[0];
            }
        };
        return builder;
    });

    const db = { transaction: vi.fn(async (work) => work(trx)) };
    return { db, trx, spy };
}

function bookFor({ database = createDb(), ...overrides } = {}) {
    return createBookings({
        db: database.db,
        broadcaster: BROADCASTER,
        now: NOW,
        user: USER,
        showtimeId: SHOWTIME.id,
        seatIds: [SEAT_A1.id],
        ...overrides
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    seatsByIds.mockResolvedValue([SEAT_A1]);
    activeHolds.mockResolvedValue([]);
    deleteHoldsForSeats.mockResolvedValue(undefined);
    seatsChanged.mockResolvedValue(undefined);
    seatLabel.mockImplementation((seat) => `${seat.row}${seat.number}`);
    buildBooking.mockImplementation(({ seat }) => ({ seat_id: seat.id, built: true }));
    insertBooking.mockImplementation(async (_trx, booking) => ({ ...booking, id: booking.seat_id + 1_000 }));
});

describe("createBookings – Vorstellung sperren", () => {
    it("laedt die Vorstellung mit pessimistischem Lock in der Transaktion", async () => {
        const database = createDb();

        await bookFor({ database });

        expect(database.db.transaction).toHaveBeenCalledTimes(1);
        expect(database.spy.tables).toEqual(["showtimes"]);
        expect(database.spy.conditions).toEqual([{ id: SHOWTIME.id }]);
        expect(database.spy.forUpdate).toBe(true);
    });

    it("wirft RecordNotFound, wenn die Vorstellung nicht existiert", async () => {
        const database = createDb({ showtimes: [OTHER_SHOWTIME] });

        const error = await bookFor({ database }).catch((caught) => caught);

        expect(error).toBeInstanceOf(RecordNotFound);
        expect(error.message).toBe("Showtime mit id=42 nicht gefunden");
        expect(seatsByIds).not.toHaveBeenCalled();
    });
});

describe("createBookings – Sitzplatzpruefung", () => {
    it("fragt die Plaetze im Saal der gesperrten Vorstellung ab", async () => {
        const database = createDb();

        await bookFor({ database });

        expect(seatsByIds).toHaveBeenCalledWith(database.trx, SHOWTIME.auditorium_id, [SEAT_A1.id]);
    });

    it("weist Plaetze ab, die nicht zum Saal gehoeren", async () => {
        seatsByIds.mockResolvedValue([SEAT_A1]);

        const error = await bookFor({ seatIds: [SEAT_A1.id, SEAT_A2.id] }).catch((caught) => caught);

        expect(error).toBeInstanceOf(RecordInvalid);
        expect(error.message).toBe("Sitzplatz gehoert nicht zum Saal dieser Vorstellung");
        expect(error.errors.on("seat")).toEqual(["gehoert nicht zum Saal dieser Vorstellung"]);
        expect(insertBooking).not.toHaveBeenCalled();
    });

    it("fragt die aktiven Reservierungen der Vorstellung ab", async () => {
        const database = createDb();

        await bookFor({ database });

        expect(activeHolds).toHaveBeenCalledWith(database.trx, SHOWTIME.id, NOW);
    });

    it("laesst eine eigene Reservierung die Buchung nicht blockieren", async () => {
        activeHolds.mockResolvedValue([{ seat_id: SEAT_A1.id, user_id: USER.id }]);

        const result = await bookFor();

        expect(result.seats).toEqual([SEAT_A1]);
    });

    it("ignoriert fremde Reservierungen auf nicht gewaehlten Plaetzen", async () => {
        activeHolds.mockResolvedValue([{ seat_id: SEAT_A2.id, user_id: OTHER_USER_ID }]);

        const result = await bookFor();

        expect(result.seats).toEqual([SEAT_A1]);
    });

    it("nennt nur den fremd reservierten Platz", async () => {
        seatsByIds.mockResolvedValue([SEAT_A1, SEAT_A2]);
        activeHolds.mockResolvedValue([{ seat_id: SEAT_A2.id, user_id: OTHER_USER_ID }]);

        const error = await bookFor({ seatIds: [SEAT_A1.id, SEAT_A2.id] }).catch((caught) => caught);

        expect(error).toBeInstanceOf(RecordInvalid);
        expect(error.message).toBe("Sitzplatz A2 wird gerade von einer anderen Person gebucht");
        expect(error.errors.on("seat")).toEqual(["A2 wird gerade von einer anderen Person gebucht"]);
    });

    it("zaehlt mehrere fremd reservierte Plaetze kommagetrennt auf", async () => {
        seatsByIds.mockResolvedValue([SEAT_A1, SEAT_A2]);
        activeHolds.mockResolvedValue([
            { seat_id: SEAT_A1.id, user_id: OTHER_USER_ID },
            { seat_id: SEAT_A2.id, user_id: OTHER_USER_ID }
        ]);

        const error = await bookFor({ seatIds: [SEAT_A1.id, SEAT_A2.id] }).catch((caught) => caught);

        expect(error.message).toBe("Sitzplatz A1, A2 wird gerade von einer anderen Person gebucht");
        expect(seatLabel).toHaveBeenCalledTimes(2);
    });

    it("bucht nicht, wenn ein Platz fremd reserviert ist", async () => {
        activeHolds.mockResolvedValue([{ seat_id: SEAT_A1.id, user_id: OTHER_USER_ID }]);

        await bookFor().catch(() => { });

        expect(buildBooking).not.toHaveBeenCalled();
        expect(deleteHoldsForSeats).not.toHaveBeenCalled();
        expect(seatsChanged).not.toHaveBeenCalled();
    });
});

describe("createBookings – Buchungen anlegen", () => {
    it("erzeugt je Platz eine Buchung in der Transaktion", async () => {
        seatsByIds.mockResolvedValue([SEAT_A1, SEAT_A2]);
        const database = createDb();

        const result = await bookFor({
            database,
            seatIds: [SEAT_A1.id, SEAT_A2.id],
            paymentMethod: "twint"
        });

        expect(buildBooking).toHaveBeenNthCalledWith(1, {
            userId: USER.id,
            showtime: SHOWTIME,
            seat: SEAT_A1,
            paymentMethod: "twint"
        });
        expect(buildBooking).toHaveBeenNthCalledWith(2, {
            userId: USER.id,
            showtime: SHOWTIME,
            seat: SEAT_A2,
            paymentMethod: "twint"
        });
        expect(insertBooking).toHaveBeenNthCalledWith(
            1,
            database.trx,
            { seat_id: SEAT_A1.id, built: true },
            { seat: SEAT_A1, showtime: SHOWTIME, now: NOW }
        );
        expect(insertBooking).toHaveBeenNthCalledWith(
            2,
            database.trx,
            { seat_id: SEAT_A2.id, built: true },
            { seat: SEAT_A2, showtime: SHOWTIME, now: NOW }
        );
        expect(result.bookings).toEqual([
            { seat_id: SEAT_A1.id, built: true, id: 1_101 },
            { seat_id: SEAT_A2.id, built: true, id: 1_102 }
        ]);
    });

    it("bucht ohne Zahlungsmethode mit null", async () => {
        await bookFor();

        expect(buildBooking).toHaveBeenCalledWith({
            userId: USER.id,
            showtime: SHOWTIME,
            seat: SEAT_A1,
            paymentMethod: null
        });
    });

    it("loescht die Reservierungen der gebuchten Plaetze", async () => {
        seatsByIds.mockResolvedValue([SEAT_A1, SEAT_A2]);
        const database = createDb();

        await bookFor({ database, seatIds: [SEAT_A1.id, SEAT_A2.id] });

        expect(deleteHoldsForSeats).toHaveBeenCalledWith(database.trx, SHOWTIME.id, [SEAT_A1.id, SEAT_A2.id]);
    });

    it("liefert Vorstellung, Plaetze und Buchungen zurueck", async () => {
        const result = await bookFor();

        expect(result).toEqual({
            showtime: SHOWTIME,
            seats: [SEAT_A1],
            bookings: [{ seat_id: SEAT_A1.id, built: true, id: 1_101 }]
        });
    });
});

describe("createBookings – Broadcast", () => {
    it("meldet die geaenderten Plaetze nach der Transaktion", async () => {
        seatsByIds.mockResolvedValue([SEAT_A1, SEAT_A2]);
        const database = createDb();

        await bookFor({ database, seatIds: [SEAT_A1.id, SEAT_A2.id] });

        expect(seatsChanged).toHaveBeenCalledWith({ db: database.db, broadcaster: BROADCASTER, now: NOW }, SHOWTIME.id, [
            SEAT_A1.id,
            SEAT_A2.id
        ]);
    });

    it("meldet erst, nachdem die Reservierungen geloescht sind", async () => {
        const order = [];
        deleteHoldsForSeats.mockImplementation(async () => void order.push("deleteHoldsForSeats"));
        seatsChanged.mockImplementation(async () => void order.push("seatsChanged"));

        await bookFor();

        expect(order).toEqual(["deleteHoldsForSeats", "seatsChanged"]);
    });
});
