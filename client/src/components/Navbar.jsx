import { Link, useLocation, useNavigate } from "react-router";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useFlash } from "../context/FlashContext.jsx";
import { Brand } from "./Brand.jsx";

// shared/_navbar.html.erb
export function Navbar() {
  const { user, loggedIn, admin, setUser } = useAuth();
  const { flashNext } = useFlash();
  const location = useLocation();
  const navigate = useNavigate();

  // ApplicationHelper#nav_link_class
  const navLinkClass = (path) =>
    `transition ${location.pathname.startsWith(path) ? "text-white" : "text-slate-400 hover:text-white"}`;

  async function logout() {
    const data = await api("/session", { method: "DELETE" });
    setUser(null);
    flashNext({ notice: data.notice });
    navigate("/");
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-8">
          <Link to="/">
            <Brand />
          </Link>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <Link to="/showtimes" className={navLinkClass("/showtimes")}>Programm</Link>
            {loggedIn && !admin && (
              <Link to="/bookings" className={navLinkClass("/bookings")}>Meine Tickets</Link>
            )}
            {admin && (
              <>
                <Link to="/admin/movies" className={navLinkClass("/admin/movies")}>Filme</Link>
                <Link to="/admin/auditoria" className={navLinkClass("/admin/auditoria")}>Säle</Link>
                <Link to="/admin/showtimes" className={navLinkClass("/admin/showtimes")}>Spielplan</Link>
                <Link to="/users" className={navLinkClass("/users")}>Benutzer</Link>
                <Link to="/admin/activity_logs" className={navLinkClass("/admin/activity_logs")}>Protokoll</Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {loggedIn ? (
            <>
              <Link to={`/users/${user.id}`} className="text-slate-300 transition hover:text-white">{user.name}</Link>
              {admin && <span className="ka-chip">Admin</span>}
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-300 transition hover:border-white/30 hover:text-white"
              >
                Abmelden
              </button>
            </>
          ) : (
            <>
              <Link to="/signup" className="text-slate-300 transition hover:text-white">Registrieren</Link>
              <Link to="/login" className="rounded-lg bg-brand-500 px-4 py-1.5 font-medium text-white transition hover:bg-brand-400">
                Anmelden
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
