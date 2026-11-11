import { describe, expect, it } from "vitest";

import {
    LOCKOUT_PERIOD_MS,
    LoginThrottle,
    MAX_FAILED_ATTEMPTS,
    throttleKey
} from "./loginThrottle.js";

// M450 LB1 / Teil 2: Unit-Test fuer reine Logik.
// Black-Box-Entwurf (Aequivalenzklassen, Grenzwerte, Positiv-/Negativtests),
// White-Box-Pruefung ueber Coverage und Mutationstests.

// Steuerbare Uhr: erlaubt exakte Grenzwerttests ohne echte Wartezeit.
function createClock(start = 1_700_000_000_000) {
    let current = start;
    return {
        now: () => current,
        advance(ms) {
            current += ms;
            return current;
        }
    };
}

function createThrottle(overrides = {}) {
    const clock = createClock();
    const throttle = new LoginThrottle({ now: clock.now, ...overrides });
    return { throttle, clock };
}

const KEY = "login:10.0.0.1:anna@example.ch";

describe("Konstanten", () => {
    it("sperrt nach 5 Fehlversuchen", () => {
        expect(MAX_FAILED_ATTEMPTS).toBe(5);
    });

    it("haelt die Sperrfrist von 15 Minuten in Millisekunden", () => {
        expect(LOCKOUT_PERIOD_MS).toBe(900_000);
    });
});

describe("throttleKey", () => {
    it("setzt den Schluessel aus Praefix, IP und E-Mail zusammen", () => {
        expect(throttleKey("10.0.0.1", "anna@example.ch")).toBe("login:10.0.0.1:anna@example.ch");
    });

    it("entfernt umschliessende Leerzeichen der E-Mail", () => {
        expect(throttleKey("10.0.0.1", "  anna@example.ch \t")).toBe("login:10.0.0.1:anna@example.ch");
    });

    it("normalisiert Grossschreibung zu Kleinbuchstaben", () => {
        expect(throttleKey("10.0.0.1", "Anna@Example.CH")).toBe("login:10.0.0.1:anna@example.ch");
    });

    it("behandelt null wie eine leere E-Mail", () => {
        expect(throttleKey("10.0.0.1", null)).toBe("login:10.0.0.1:");
    });

    it("behandelt undefined wie eine leere E-Mail", () => {
        expect(throttleKey("10.0.0.1", undefined)).toBe("login:10.0.0.1:");
    });

    it("trennt verschiedene IP-Adressen desselben Kontos", () => {
        expect(throttleKey("10.0.0.2", "anna@example.ch")).not.toBe(throttleKey("10.0.0.1", "anna@example.ch"));
    });
});

describe("LoginThrottle – Konstruktor", () => {
    it("verwendet ohne Argumente die Standardwerte", () => {
        const throttle = new LoginThrottle();

        expect(throttle.maxAttempts).toBe(MAX_FAILED_ATTEMPTS);
        expect(throttle.lockoutMs).toBe(LOCKOUT_PERIOD_MS);
        expect(throttle.entries.size).toBe(0);
    });

    it("nutzt ohne injizierte Uhr die Systemzeit", () => {
        const before = Date.now();
        const throttle = new LoginThrottle();

        throttle.registerFailure(KEY);

        const expiresAt = throttle.entries.get(KEY).expiresAt;
        expect(expiresAt).toBeGreaterThanOrEqual(before + LOCKOUT_PERIOD_MS);
        expect(expiresAt).toBeLessThanOrEqual(Date.now() + LOCKOUT_PERIOD_MS);
    });

    it("uebernimmt eigene Grenzwerte", () => {
        const { throttle } = createThrottle({ maxAttempts: 2, lockoutMs: 1_000 });

        expect(throttle.maxAttempts).toBe(2);
        expect(throttle.lockoutMs).toBe(1_000);
    });
});

describe("LoginThrottle – failedAttempts", () => {
    it("meldet 0 fuer einen unbekannten Schluessel", () => {
        const { throttle } = createThrottle();

        expect(throttle.failedAttempts("login:10.0.0.9:unbekannt@example.ch")).toBe(0);
    });

    it("zaehlt registrierte Fehlversuche", () => {
        const { throttle } = createThrottle();

        throttle.registerFailure(KEY);
        throttle.registerFailure(KEY);

        expect(throttle.failedAttempts(KEY)).toBe(2);
    });

    it("zaehlt eine Millisekunde vor Ablauf der Sperrfrist noch mit", () => {
        const { throttle, clock } = createThrottle();
        throttle.registerFailure(KEY);

        clock.advance(LOCKOUT_PERIOD_MS - 1);

        expect(throttle.failedAttempts(KEY)).toBe(1);
    });

    it("verfaellt exakt im Moment des Ablaufs", () => {
        const { throttle, clock } = createThrottle();
        throttle.registerFailure(KEY);

        clock.advance(LOCKOUT_PERIOD_MS);

        expect(throttle.failedAttempts(KEY)).toBe(0);
    });

    it("entfernt den abgelaufenen Eintrag beim Lesen", () => {
        const { throttle, clock } = createThrottle();
        throttle.registerFailure(KEY);
        clock.advance(LOCKOUT_PERIOD_MS + 1);

        throttle.failedAttempts(KEY);

        expect(throttle.entries.has(KEY)).toBe(false);
    });
});

describe("LoginThrottle – isLockedOut", () => {
    it("sperrt einen unbekannten Schluessel nicht", () => {
        const { throttle } = createThrottle();

        expect(throttle.isLockedOut(KEY)).toBe(false);
    });

    it("sperrt einen Fehlversuch unterhalb der Grenze noch nicht", () => {
        const { throttle } = createThrottle({ maxAttempts: 3 });
        throttle.registerFailure(KEY);
        throttle.registerFailure(KEY);

        expect(throttle.isLockedOut(KEY)).toBe(false);
    });

    it("sperrt genau beim Erreichen der Grenze", () => {
        const { throttle } = createThrottle({ maxAttempts: 3 });
        throttle.registerFailure(KEY);
        throttle.registerFailure(KEY);
        throttle.registerFailure(KEY);

        expect(throttle.isLockedOut(KEY)).toBe(true);
    });

    it("bleibt oberhalb der Grenze gesperrt", () => {
        const { throttle } = createThrottle({ maxAttempts: 3 });
        for (let attempt = 0; attempt < 4; attempt += 1) throttle.registerFailure(KEY);

        expect(throttle.isLockedOut(KEY)).toBe(true);
    });

    it("hebt die Sperre nach Ablauf der Sperrfrist auf", () => {
        const { throttle, clock } = createThrottle({ maxAttempts: 2 });
        throttle.registerFailure(KEY);
        throttle.registerFailure(KEY);

        clock.advance(LOCKOUT_PERIOD_MS);

        expect(throttle.isLockedOut(KEY)).toBe(false);
    });
});

describe("LoginThrottle – registerFailure", () => {
    it("liefert den neuen Zaehlerstand zurueck", () => {
        const { throttle } = createThrottle();

        expect(throttle.registerFailure(KEY)).toBe(1);
        expect(throttle.registerFailure(KEY)).toBe(2);
        expect(throttle.registerFailure(KEY)).toBe(3);
    });

    it("setzt den Ablauf auf jetzt plus Sperrfrist", () => {
        const { throttle, clock } = createThrottle({ lockoutMs: 1_000 });

        throttle.registerFailure(KEY);

        expect(throttle.entries.get(KEY)).toEqual({ count: 1, expiresAt: clock.now() + 1_000 });
    });

    it("verlaengert die Sperrfrist bei jedem weiteren Fehlversuch", () => {
        const { throttle, clock } = createThrottle({ lockoutMs: 1_000 });
        throttle.registerFailure(KEY);

        clock.advance(999);
        throttle.registerFailure(KEY);

        expect(throttle.entries.get(KEY)).toEqual({ count: 2, expiresAt: clock.now() + 1_000 });
    });

    it("beginnt nach abgelaufener Sperrfrist wieder bei 1", () => {
        const { throttle, clock } = createThrottle({ lockoutMs: 1_000 });
        throttle.registerFailure(KEY);
        throttle.registerFailure(KEY);

        clock.advance(1_000);

        expect(throttle.registerFailure(KEY)).toBe(1);
    });

    it("zaehlt verschiedene Schluessel unabhaengig voneinander", () => {
        const { throttle } = createThrottle();
        const otherKey = "login:10.0.0.2:bob@example.ch";

        throttle.registerFailure(KEY);
        throttle.registerFailure(KEY);
        throttle.registerFailure(otherKey);

        expect(throttle.failedAttempts(KEY)).toBe(2);
        expect(throttle.failedAttempts(otherKey)).toBe(1);
    });
});

describe("LoginThrottle – Speicherobergrenze", () => {
    // MAX_ENTRIES (10 000) ist modulintern; die Grenze wird ueber die Map-Groesse geprueft.
    const MAX_ENTRIES = 10_000;

    function fillExpiredEntries(throttle, clock, count) {
        for (let index = 0; index < count; index += 1) throttle.registerFailure(`login:10.0.0.1:user${index}@example.ch`);
        clock.advance(LOCKOUT_PERIOD_MS);
    }

    it("raeumt beim Erreichen der Obergrenze noch nicht auf", () => {
        const { throttle, clock } = createThrottle();
        fillExpiredEntries(throttle, clock, MAX_ENTRIES - 1);

        throttle.registerFailure("login:10.0.0.1:neu-1@example.ch");

        expect(throttle.entries.size).toBe(MAX_ENTRIES);
    });

    it("raeumt abgelaufene Eintraege beim Ueberschreiten der Obergrenze auf", () => {
        const { throttle, clock } = createThrottle();
        fillExpiredEntries(throttle, clock, MAX_ENTRIES - 1);
        throttle.registerFailure("login:10.0.0.1:neu-1@example.ch");

        throttle.registerFailure("login:10.0.0.1:neu-2@example.ch");

        expect(throttle.entries.size).toBe(2);
    });
});

describe("LoginThrottle – clear", () => {
    it("loescht den Zaehler eines Schluessels", () => {
        const { throttle } = createThrottle();
        throttle.registerFailure(KEY);

        throttle.clear(KEY);

        expect(throttle.entries.has(KEY)).toBe(false);
        expect(throttle.failedAttempts(KEY)).toBe(0);
    });

    it("laesst andere Schluessel unberuehrt", () => {
        const { throttle } = createThrottle();
        const otherKey = "login:10.0.0.2:bob@example.ch";
        throttle.registerFailure(KEY);
        throttle.registerFailure(otherKey);

        throttle.clear(KEY);

        expect(throttle.failedAttempts(otherKey)).toBe(1);
    });

    it("bleibt bei einem unbekannten Schluessel folgenlos", () => {
        const { throttle } = createThrottle();
        throttle.registerFailure(KEY);

        throttle.clear("login:10.0.0.9:unbekannt@example.ch");

        expect(throttle.entries.size).toBe(1);
    });
});

describe("LoginThrottle – prune", () => {
    it("entfernt Eintraege, deren Sperrfrist exakt abgelaufen ist", () => {
        const { throttle, clock } = createThrottle({ lockoutMs: 1_000 });
        throttle.registerFailure(KEY);

        clock.advance(1_000);
        throttle.prune();

        expect(throttle.entries.has(KEY)).toBe(false);
    });

    it("behaelt Eintraege, deren Sperrfrist noch eine Millisekunde laeuft", () => {
        const { throttle, clock } = createThrottle({ lockoutMs: 1_000 });
        throttle.registerFailure(KEY);

        clock.advance(999);
        throttle.prune();

        expect(throttle.entries.get(KEY)).toEqual({ count: 1, expiresAt: clock.now() + 1 });
    });

    it("trennt abgelaufene von aktiven Eintraegen", () => {
        const { throttle, clock } = createThrottle({ lockoutMs: 1_000 });
        const freshKey = "login:10.0.0.2:bob@example.ch";
        throttle.registerFailure(KEY);
        clock.advance(1_000);
        throttle.registerFailure(freshKey);

        throttle.prune();

        expect([...throttle.entries.keys()]).toEqual([freshKey]);
    });

    it("bleibt bei leerem Speicher folgenlos", () => {
        const { throttle } = createThrottle();

        throttle.prune();

        expect(throttle.entries.size).toBe(0);
    });
});
