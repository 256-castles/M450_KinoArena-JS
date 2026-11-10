// Modul 450 TDD
import { describe, it, expect } from "vitest";
import { averageTicketsPerShowtime } from "./statistics.js";

describe("averageTicketsPerShowtime", () => {
  // Input: [10, 0, 5], Output: 5
  it("Normalfall: berechnet den Mittelwert inkl. Vorstellungen ohne Tickets", () => {
    // Arrange: prepare the input
    const ticketsSold = [10, 0, 5];
    // Act: call the function
    const mittelwert = averageTicketsPerShowtime(ticketsSold);
    // Assert: check the result
    expect(mittelwert).toBe(5);
  });

  // Input: [7] - Output: 7
  it("gibt bei nur einer Vorstellung deren Ticketzahl zurück", () => {
    const ticketsSold = [7];
    const mittelwert = averageTicketsPerShowtime(ticketsSold);
    expect(mittelwert).toBe(7);
  });

  // Input: [0, 0, 0] - Output: 0
  it("gibt 0 zurück, wenn keine Tickets verkauft wurden", () => {
    const ticketsSold = [0, 0, 0];
    const mittelwert = averageTicketsPerShowtime(ticketsSold);
    expect(mittelwert).toBe(0);
  });

  // Input: [1, 1, 2] - Output: ungefähr 1.333 (muss  mit toBeClosteTo() geprüft werden, weil Computer bei Kommazahlen ungenau rechnen können)
  it("Ergebnis mit einer Nachkommastelle", () => {
    const ticketsSold = [1, 1, 2];
    const mittelwert = averageTicketsPerShowtime(ticketsSold);
    expect(mittelwert).toBeCloseTo(1.333, 3);
  });

  // Input: [] - Output: Error
  it("wirft einen Fehler, wenn keine Vorstellungen vorhanden sind", () => {
    const ticketsSold = [];
    expect(() => averageTicketsPerShowtime(ticketsSold)).toThrow("Keine Vorstellung vorhanden.");
  });
});
