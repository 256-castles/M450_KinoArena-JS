// M450 - Mocking mit releaseExpired
import { describe, it, expect, vi } from "vitest";
import { releaseExpired } from "./seatHolds.js";

// Relevante Zeilen Datenbank-Abfrage:
/* 1) Struktur db().where()
        await db("seat_holds").where("expires_at", "<", now);
      db() hat where(), das aufgerufen wird und es gibt eine Liste zurück
*/
/* 2) Struktur db().where().del()
        await db("seat_holds").where({ id: hold.id }).del();
      db() hat where(), das wiederum del() hat, welches deletedCount zurückgibt
*/
// vi.fn() <- schreibt sich alles auf, wie die Funktion aufgerufen wurde.
function createDbMock({ expired = [], deletedCount = 1 } = {}) {
    const del = vi.fn().mockResolvedValue(deletedCount);    // mockResolvedValue(), weil es ein Promise lösen muss; dasselbe wie vi.fn(() => Promise.resolve(1)
    const where = vi.fn((condition) => typeof condition === "string" ? Promise.resolve(expired) : { del }); // Text (Abfrage) -> expired als Promise; Objekt (Löschen)  -> { del}
    const db = vi.fn(() => ({ where }));  // Ein Objekt mit where
    return { db, where, del };
}

describe("releaseExpired", () => {
    it("gibt 0 zurück und löscht nichts, weil keine Reservierung abgelaufen ist", async () => {
        //Arrange
        const { db, del } = createDbMock({ expired: [] });
        const onReleased = vi.fn();

        //Act
        const count = await releaseExpired(db, { now: new Date(), onReleased });

        //Assert
        expect(count).toBe(0);
        expect(del).not.toHaveBeenCalled();
        expect(onReleased).not.toHaveBeenCalled();
    });

    it("2 Holds abgelaufen, beide gelöscht; Rückgabe gleich 2", async () => {
        // Arrange
        const hold1 = { id: 1 };
        const hold2 = { id: 2 };
        const { db, where, del } = createDbMock({ expired: [hold1, hold2] });
        const onReleased = vi.fn();

        // Act
        const count = await releaseExpired(db, { now: new Date(), onReleased });

        // Assert
        expect(count).toBe(2);
        expect(onReleased).toHaveBeenCalledTimes(2);
        expect(onReleased).toHaveBeenCalledWith(hold1);
        expect(onReleased).toHaveBeenCalledWith(hold2);
        expect(del).toHaveBeenCalledTimes(2);
        expect(where).toHaveBeenCalledTimes(3);
        expect(where).toHaveBeenCalledWith({ id: 1 });
        expect(where).toHaveBeenCalledWith({ id: 2 });
    });

    it("1 Hold abgelaufen, aber onReleased nicht aufgerufen weil schon gelöscht; Rückgabe gleich 1", async () => {
        const hold1 = { id: 1 };
        const { db, where } = createDbMock({ expired: [hold1], deletedCount: 0 });
        const onReleased = vi.fn();

        const count = await releaseExpired(db, { now: new Date(), onReleased });

        expect(count).toBe(1);
        expect(onReleased).not.toHaveBeenCalled();
        expect(where).toHaveBeenCalledTimes(2);
        expect(where).toHaveBeenCalledWith({ id: 1 });

    });

    it("Korrekter Datenbankaufruf mit seat_holds und korrekter Aufruf mit where.", async () => {
        const { db, where } = createDbMock();
        const onReleased = vi.fn();
        const now = new Date();

        await releaseExpired(db, { now, onReleased });

        expect(db).toHaveBeenCalledWith("seat_holds");
        expect(where).toHaveBeenCalledWith("expires_at", "<", now);
    });

    it("funktioniert auch ohne dass onReleased übergeben wird", async () => {
        const { db } = createDbMock({ expired: [{ id: 1 }] });

        const count = await releaseExpired(db, { now: new Date() });

        expect(count).toBe(1);
    });
});