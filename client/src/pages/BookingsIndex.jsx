import { Link } from "react-router";
import { api } from "../api.js";
import { Underline } from "../components/Brand.jsx";
import { useFlash } from "../context/FlashContext.jsx";
import { useAction } from "../hooks/useAction.js";
import { useResource } from "../hooks/useResource.js";
import { chf, pluralize, showtimeDate, timeOfDay } from "../lib/format.js";

// bookings/index.html.erb – Meine Tickets
export function BookingsIndex() {
  const { data, reload } = useResource("/bookings");
  const { flashNow } = useFlash();
  const { run } = useAction();

  async function cancel(booking) {
    if (!window.confirm("Ticket wirklich stornieren?")) return;
    const result = await run(() => api(`/bookings/${booking.id}`, { method: "DELETE" }));
    if (!result) return;
    flashNow({ notice: result.notice });
    reload();
  }

  if (!data) return null;
  const { bookings } = data;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl">Meine Tickets</h1>
      <Underline />

      <p className="ka-label mt-6">{pluralize(bookings.length, "Buchung", "Buchungen")}</p>

      {bookings.length === 0 ? (
        <div className="ka-card mt-6 p-12 text-center">
          <p className="text-slate-400">Du hast noch keine Tickets gebucht.</p>
          <Link to="/" className="ka-btn-primary mt-6">Zum Programm</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {bookings.map((booking) => {
            const { showtime } = booking;
            return (
              <div key={booking.id} className="ka-card flex gap-5 overflow-hidden">
                <div className="w-24 shrink-0 bg-ink-700">
                  {showtime.movie.poster_url && (
                    <img src={showtime.movie.poster_url} alt={showtime.movie.title} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="flex-1 py-5 pr-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl">{showtime.movie.title}</h2>
                      <p className="ka-label mt-1">{booking.reference}</p>
                    </div>

                    {booking.upcoming ? (
                      <span className="ka-chip">Bevorstehend</span>
                    ) : (
                      <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-xs text-slate-500">Vergangen</span>
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <dt className="ka-label">Datum</dt>
                      <dd className="mt-0.5 text-slate-200">{showtimeDate(showtime.start_time)}</dd>
                    </div>
                    <div>
                      <dt className="ka-label">Zeit</dt>
                      <dd className="mt-0.5 font-mono text-gold-400">{timeOfDay(showtime.start_time)}</dd>
                    </div>
                    <div>
                      <dt className="ka-label">Saal</dt>
                      <dd className="mt-0.5 text-slate-200">{showtime.auditorium.name}</dd>
                    </div>
                    <div>
                      <dt className="ka-label">Preis</dt>
                      <dd className="mt-0.5 text-slate-200">{chf(booking.total_price)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="ka-chip">{booking.seat.label}</span>
                    <Link to={`/bookings/${booking.id}`} className="font-mono text-xs text-brand-400 underline transition hover:text-brand-300">
                      QR-Code anzeigen
                    </Link>
                    {booking.can_destroy && (
                      <button type="button" onClick={() => cancel(booking)}
                        className="font-mono text-xs text-slate-500 underline transition hover:text-brand-400">
                        Stornieren
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
