import { Link, useNavigate, useParams } from "react-router";
import { api } from "../api.js";
import { Underline } from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useFlash } from "../context/FlashContext.jsx";
import { useAction } from "../hooks/useAction.js";
import { useResource } from "../hooks/useResource.js";
import { chf, dateLabel, showtimeDate, timeOfDay } from "../lib/format.js";
import { NotFound } from "./NotFound.jsx";

// users/show.html.erb – Profil
export function UserShow() {
  const { id } = useParams();
  const { data, notFound } = useResource(`/users/${id}`);
  const { setUser } = useAuth();
  const { flashNext } = useFlash();
  const navigate = useNavigate();
  const { run } = useAction();

  async function destroy() {
    if (!window.confirm("Konto wirklich unwiderruflich löschen?")) return;
    const result = await run(() => api(`/users/${id}`, { method: "DELETE" }));
    if (!result) return;

    flashNext({ notice: result.notice });
    if (result.signed_out) {
      setUser(null);
      navigate("/");
    } else {
      navigate("/users");
    }
  }

  if (notFound) return <NotFound />;
  if (!data) return null;
  const { user, bookings } = data;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="ka-card p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15 font-display text-xl text-brand-400">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-2xl">{user.name}</h1>
              <p className="mt-0.5 font-mono text-sm text-slate-400">{user.email_address}</p>
              <span className="ka-chip mt-2">{user.role_name}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {user.can_update && <Link to={`/users/${user.id}/edit`} className="ka-btn-ghost text-sm">Bearbeiten</Link>}
            {user.can_destroy && (
              <button type="button" onClick={destroy}
                className="rounded-lg border border-brand-500/40 px-4 py-2.5 text-sm text-brand-400 transition hover:bg-brand-500/10">
                Konto löschen
              </button>
            )}
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-white/5 pt-6 text-sm">
          <div>
            <dt className="ka-label">Registriert seit</dt>
            <dd className="mt-1 text-slate-200">{dateLabel(user.created_at)}</dd>
          </div>
          <div>
            <dt className="ka-label">Gebuchte Tickets</dt>
            <dd className="mt-1 text-slate-200">{bookings.length}</dd>
          </div>
        </dl>
      </div>

      <div className="ka-card mt-6 p-8">
        <h2 className="text-xl">Buchungen</h2>
        <Underline className="mt-2" />

        {bookings.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">Noch keine Buchungen vorhanden.</p>
        ) : (
          <ul className="mt-5 divide-y divide-white/5">
            {bookings.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="text-slate-300">
                  <strong className="text-white">{booking.showtime.movie.title}</strong>{" "}
                  <span className="text-slate-500">
                    &middot; {showtimeDate(booking.showtime.start_time)} {timeOfDay(booking.showtime.start_time)}{" "}
                    &middot; {booking.showtime.auditorium.name}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="ka-chip">{booking.seat.label}</span>
                  <span className="font-mono text-xs text-slate-400">{chf(booking.total_price)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
