import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";

// Nachbau von flash / flash.now aus Rails:
//   flashNext – Meldung erscheint nach der naechsten Navigation (wie flash + redirect_to)
//   flashNow  – Meldung erscheint sofort auf der aktuellen Seite (wie flash.now)
const FlashContext = createContext(null);

export function FlashProvider({ children }) {
  const location = useLocation();
  const [messages, setMessages] = useState({ shown: null, pending: null });
  const lastLocationKey = useRef(location.key);

  useEffect(() => {
    if (location.key === lastLocationKey.current) return;
    lastLocationKey.current = location.key;
    setMessages((previous) => ({ shown: previous.pending, pending: null }));
  }, [location.key]);

  const flashNow = useCallback((flash) => setMessages((previous) => ({ ...previous, shown: flash })), []);
  const flashNext = useCallback((flash) => setMessages((previous) => ({ ...previous, pending: flash })), []);

  const shown = messages.shown;
  const value = useMemo(() => ({ flash: shown, flashNow, flashNext }), [shown, flashNow, flashNext]);
  return <FlashContext.Provider value={value}>{children}</FlashContext.Provider>;
}

export function useFlash() {
  return useContext(FlashContext);
}
