// Brute-Force-Schutz aus dem SessionsController des Originals.
// Bewusst prozesslokal gehalten: der Zaehler bremst Brute-Force-Versuche,
// ohne dass dafuer Benutzerdaten geschrieben werden muessen.

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_PERIOD_MS = 15 * 60 * 1000;

const MAX_ENTRIES = 10_000;

export function throttleKey(ipAddress, emailAddress) {
  return `login:${ipAddress}:${String(emailAddress ?? "").trim().toLowerCase()}`;
}

export class LoginThrottle {
  constructor({ maxAttempts = MAX_FAILED_ATTEMPTS, lockoutMs = LOCKOUT_PERIOD_MS, now = () => Date.now() } = {}) {
    this.maxAttempts = maxAttempts;
    this.lockoutMs = lockoutMs;
    this.now = now;
    this.entries = new Map();
  }

  failedAttempts(key) {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return 0;
    }
    return entry.count;
  }

  isLockedOut(key) {
    return this.failedAttempts(key) >= this.maxAttempts;
  }

  // Wie MemoryStore#increment mit expires_in: jeder Fehlversuch verlaengert die Sperrfrist.
  registerFailure(key) {
    const count = this.failedAttempts(key) + 1;
    this.entries.set(key, { count, expiresAt: this.now() + this.lockoutMs });
    if (this.entries.size > MAX_ENTRIES) this.prune();
    return count;
  }

  clear(key) {
    this.entries.delete(key);
  }

  prune() {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}
