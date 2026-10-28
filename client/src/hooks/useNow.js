import { useEffect, useState } from "react";

// Aktuelle Zeit in Millisekunden, jede Sekunde aktualisiert (fuer Countdowns).
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(ticker);
  }, [intervalMs]);

  return now;
}
