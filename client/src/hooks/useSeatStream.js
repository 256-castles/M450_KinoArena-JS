import { useEffect, useEffectEvent } from "react";

// Live-Updates des Saalplans per Server-Sent Events (ersetzt turbo_stream_from).
export function useSeatStream(showtimeId, onUpdate) {
  const handleUpdate = useEffectEvent((update) => onUpdate(update));

  useEffect(() => {
    if (!showtimeId) return undefined;

    const source = new EventSource(`/api/showtimes/${showtimeId}/seats/stream`);
    source.addEventListener("seat", (event) => handleUpdate(JSON.parse(event.data)));
    return () => source.close();
  }, [showtimeId]);
}
