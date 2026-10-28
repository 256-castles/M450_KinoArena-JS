import { Link, useParams } from "react-router";
import { LogoMark } from "../components/Brand.jsx";
import { useResource } from "../hooks/useResource.js";
import { chf, shortDateTime, showtimeDate, timeOfDay } from "../lib/format.js";
import { NotFound } from "./NotFound.jsx";

// bookings/show.html.erb – Ticket mit QR-Code
export function BookingShow() {
  const { id } = useParams();
  const { data, notFound } = useResource(`/bookings/${id}`);
  if (notFound) return <NotFound />;
  if (!data) return null;

  const { booking } = data;
  const { showtime } = booking;

  return (
    <div className="mx-auto max-w-md">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/15 via-ink-800 to-ink-800">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <LogoMark />
              <span className="font-display text-lg text-white">Kino<span className="text-brand-500">Arena</span></span>
            </div>

            <div className="text-right">
              <span className="rounded-md border border-gold-400/40 bg-gold-400/10 px-2 py-0.5 font-mono text-xs text-gold-400">
                Bestätigt
              </span>
              <p className="ka-label mt-1.5">{booking.reference}</p>
            </div>
          </div>

          <h1 className="mt-6 text-2xl">{showtime.movie.title}</h1>

          <dl className="mt-5 grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="ka-label">Datum</dt>
              <dd className="mt-1 text-slate-200">{showtimeDate(showtime.start_time)}</dd>
            </div>
            <div>
              <dt className="ka-label">Uhrzeit</dt>
              <dd className="mt-1 font-mono text-gold-400">{timeOfDay(showtime.start_time)}</dd>
            </div>
            <div>
              <dt className="ka-label">Saal</dt>
              <dd className="mt-1 text-slate-200">{showtime.auditorium.name}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <p className="ka-label">Sitzplatz</p>
            <p className="mt-1.5"><span className="ka-chip text-sm">{booking.seat.label}</span></p>
          </div>
        </div>

        <div className="relative border-t border-dashed border-white/15">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-ink-950" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-ink-950" />
        </div>

        <div className="flex items-center gap-5 p-6">
          {/* Vom Server erzeugtes SVG (qrcode), enthaelt keine Benutzereingaben */}
          <div className="shrink-0 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: booking.qr_svg }} />

          <div>
            <p className="text-sm text-slate-400">Diesen QR-Code an der Kinokasse vorzeigen.</p>
            <p className="ka-label mt-4">Gesamtbetrag</p>
            <p className="font-display text-3xl text-gold-400">{chf(booking.total_price)}</p>
            <p className="ka-label mt-1 normal-case tracking-normal">bezahlt mit {booking.payment_method_label}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link to="/bookings" className="ka-btn-ghost flex-1">Meine Tickets</Link>
        <Link to="/" className="ka-btn-primary flex-1">Weiteres buchen</Link>
      </div>

      <p className="mt-5 text-center text-xs text-slate-500">
        Gebucht am {shortDateTime(booking.created_at)} für{" "}
        <span className="font-mono text-slate-400">{booking.user.email_address}</span>
      </p>
    </div>
  );
}
