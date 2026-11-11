import { beforeEach, describe, expect, it, vi } from "vitest";

import { averageOccupancy, occupancyRate, occupancyStats, summarizeOccupancy } from "./statsService.js";

// M450 LB1 / Teil 4: Test-Driven Development.
// Diese Datei wurde VOR der Implementierung geschrieben (Red-Phase) und
// beschreibt die Auslastungsstatistik ueber alle Vorstellungen.

describe("occupancyRate", () => {
    it("meldet 0 fuer eine leere Vorstellung", () => {
        expect(occupancyRate(0, 100)).toBe(0);
    });

    it("meldet 0.5 bei halb besetztem Saal", () => {
        expect(occupancyRate(50, 100)).toBe(0.5);
    });

    it("meldet 1 fuer eine ausverkaufte Vorstellung", () => {
        expect(occupancyRate(120, 120)).toBe(1);
    });

    it("meldet 0 fuer einen Saal ohne Sitzplaetze", () => {
        expect(occupancyRate(0, 0)).toBe(0);
    });

    it("meldet 0 bei fehlender Sitzplatzangabe", () => {
        expect(occupancyRate(5, null)).toBe(0);
    });

    it("meldet 0, wenn die Buchungszahl fehlt", () => {
        expect(occupancyRate(undefined, 100)).toBe(0);
    });

    it("meldet 0 bei einer unlesbaren Buchungszahl", () => {
        expect(occupancyRate("keine Zahl", 100)).toBe(0);
    });

    it("deckelt die Quote bei 1, falls mehr Buchungen als Plaetze gemeldet werden", () => {
        expect(occupancyRate(130, 120)).toBe(1);
    });
});

describe("summarizeOccupancy", () => {
    it("liefert Nullwerte ohne Vorstellungen", () => {
        expect(summarizeOccupancy([])).toEqual({
            showtimeCount: 0,
            average: 0,
            median: 0,
            min: 0,
            max: 0
        });
    });

    it("berechnet die Kennzahlen einer einzelnen Vorstellung", () => {
        const rows = [{ booked_seats: 25, total_seats: 100 }];

        expect(summarizeOccupancy(rows)).toEqual({
            showtimeCount: 1,
            average: 0.25,
            median: 0.25,
            min: 0.25,
            max: 0.25
        });
    });

    it("nimmt bei ungerader Anzahl den mittleren Wert als Median", () => {
        const rows = [
            { booked_seats: 10, total_seats: 100 },
            { booked_seats: 90, total_seats: 100 },
            { booked_seats: 50, total_seats: 100 }
        ];

        expect(summarizeOccupancy(rows)).toEqual({
            showtimeCount: 3,
            average: 0.5,
            median: 0.5,
            min: 0.1,
            max: 0.9
        });
    });

    it("mittelt bei gerader Anzahl die beiden mittleren Werte", () => {
        const rows = [
            { booked_seats: 20, total_seats: 100 },
            { booked_seats: 80, total_seats: 100 },
            { booked_seats: 40, total_seats: 100 },
            { booked_seats: 60, total_seats: 100 }
        ];

        const stats = summarizeOccupancy(rows);

        expect(stats.median).toBe(0.5);
        expect(stats.average).toBe(0.5);
    });

    it("ist unabhaengig von der Reihenfolge der Zeilen", () => {
        const ascending = [
            { booked_seats: 10, total_seats: 100 },
            { booked_seats: 70, total_seats: 100 }
        ];
        const descending = [...ascending].reverse();

        expect(summarizeOccupancy(descending)).toEqual(summarizeOccupancy(ascending));
    });

    it("vergleicht Saele unterschiedlicher Groesse ueber die Quote", () => {
        const rows = [
            { booked_seats: 5, total_seats: 10 },
            { booked_seats: 150, total_seats: 200 }
        ];

        expect(summarizeOccupancy(rows)).toEqual({
            showtimeCount: 2,
            average: 0.625,
            median: 0.625,
            min: 0.5,
            max: 0.75
        });
    });

    it("zaehlt Vorstellungen ohne Sitzplatzangabe als 0 mit", () => {
        const rows = [
            { booked_seats: 0, total_seats: 0 },
            { booked_seats: 50, total_seats: 100 }
        ];

        expect(summarizeOccupancy(rows)).toEqual({
            showtimeCount: 2,
            average: 0.25,
            median: 0.25,
            min: 0,
            max: 0.5
        });
    });

    it("liest Zahlen auch aus Zeichenketten des Datenbanktreibers", () => {
        const rows = [{ booked_seats: "30", total_seats: "60" }];

        expect(summarizeOccupancy(rows).average).toBe(0.5);
    });
});

describe("occupancyStats", () => {
    let rows;
    let query;
    let db;

    beforeEach(() => {
        rows = [
            { showtime_id: 1, booked_seats: 20, total_seats: 100 },
            { showtime_id: 2, booked_seats: 60, total_seats: 100 }
        ];
        query = {
            join: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            count: vi.fn().mockResolvedValue(rows)
        };
        db = vi.fn(() => query);
    });

    it("aggregiert Buchungen je Vorstellung mit der Saalgroesse", async () => {
        await occupancyStats(db);

        expect(db).toHaveBeenCalledWith("showtimes");
        expect(query.join).toHaveBeenCalledWith("auditoria", "auditoria.id", "showtimes.auditorium_id");
        expect(query.leftJoin).toHaveBeenCalledWith("bookings", "bookings.showtime_id", "showtimes.id");
        expect(query.groupBy).toHaveBeenCalledWith("showtimes.id", "auditoria.total_seats");
        expect(query.select).toHaveBeenCalledWith("showtimes.id as showtime_id", "auditoria.total_seats");
        expect(query.count).toHaveBeenCalledWith("bookings.id as booked_seats");
    });

    it("fasst das Abfrageergebnis zu Kennzahlen zusammen", async () => {
        expect(await occupancyStats(db)).toEqual({
            showtimeCount: 2,
            average: 0.4,
            median: 0.4,
            min: 0.2,
            max: 0.6
        });
    });

    it("liefert Nullwerte, wenn keine Vorstellungen vorhanden sind", async () => {
        query.count.mockResolvedValue([]);

        expect(await occupancyStats(db)).toEqual({
            showtimeCount: 0,
            average: 0,
            median: 0,
            min: 0,
            max: 0
        });
    });
});

describe("averageOccupancy", () => {
    it("liefert nur die durchschnittliche Auslastung", async () => {
        const query = {
            join: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            count: vi.fn().mockResolvedValue([
                { booked_seats: 25, total_seats: 100 },
                { booked_seats: 75, total_seats: 100 }
            ])
        };

        expect(await averageOccupancy(vi.fn(() => query))).toBe(0.5);
    });
});
