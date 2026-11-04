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

});