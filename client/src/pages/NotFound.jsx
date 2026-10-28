import { Link } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";

// errors/not_found.html.erb
export function NotFound() {
  const { loggedIn, admin } = useAuth();

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="font-display text-7xl text-brand-500">404</p>

      <h1 className="mt-4 text-3xl">Diese Seite gibt es nicht</h1>

      <p className="mt-4 text-slate-400">
        Der gesuchte Film, die Vorstellung oder das Ticket wurde nicht gefunden.
        Möglicherweise wurde der Eintrag zwischenzeitlich entfernt.
      </p>

      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="ka-btn-primary">Zum Programm</Link>
        {loggedIn && !admin && <Link to="/bookings" className="ka-btn-ghost">Meine Tickets</Link>}
      </div>
    </div>
  );
}
