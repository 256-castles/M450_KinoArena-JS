// MODUL M450 - Testing - TDD

/**
 * Berechnet durchschnittlich verkaufte Tickets pro Filmvorführung
 * @param {number[]} ticketsSold Liste mit int
 * @returns {number} mittelwert, ungerundet
 * @throws {Error} wenn die Liste leer ist
 */
export function averageTicketsPerShowtime(ticketsSold) {
    if (ticketsSold.length === 0) {
        throw new Error("Keine Vorstellung vorhanden.");
    }

    const summe = ticketsSold.reduce((total, tickets) => total + tickets, 0);
    const mittelwert = summe / ticketsSold.length;
    return mittelwert;
}
