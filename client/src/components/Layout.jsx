import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { Outlet } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { Flash } from "./Flash.jsx";
import { Navbar } from "./Navbar.jsx";

// Ziel fuer den Hero-Bereich zwischen Navigation und Inhalt (content_for :hero)
const HeroContext = createContext(null);

export function Hero({ children }) {
  const target = useContext(HeroContext);
  return target ? createPortal(children, target) : null;
}

// layouts/application.html.erb
export function Layout() {
  const { loading } = useAuth();
  const [heroTarget, setHeroTarget] = useState(null);

  return (
    <HeroContext.Provider value={heroTarget}>
      <Navbar />

      <div ref={setHeroTarget} />

      <main className="mx-auto w-full max-w-6xl px-5 py-10">
        <Flash />
        {!loading && <Outlet />}
      </main>

      <footer className="border-t border-white/5 py-8 text-center">
        <p className="ka-label">KinoArena &middot; Smart Cinema Booking</p>
      </footer>
    </HeroContext.Provider>
  );
}
