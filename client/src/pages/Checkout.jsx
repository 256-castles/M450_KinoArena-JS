import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { api, ApiError } from "../api.js";
import { CrossIcon } from "../components/Brand.jsx";
import { useFlash } from "../context/FlashContext.jsx";
import { useApiErrorHandler } from "../hooks/useApiErrorHandler.js";
import { useNow } from "../hooks/useNow.js";
import { chf, pluralize, showtimeDate, timeOfDay } from "../lib/format.js";
import { formatDuration, remainingSeconds } from "../lib/seatMapState.js";
import { NotFound } from "./NotFound.jsx";

const PROCESSING_DELAY = 1600;

const PAYMENT_SUBTITLES = {
  apple_pay: "Touch ID oder Face ID",
  credit_card: "Visa, Mastercard, Amex",
  twint: "Schweizer Mobile Payment"
};

function HoldTimer({ expiresAt }) {
  const now = useNow();
  const remaining = remainingSeconds(new Date(expiresAt).getTime(), now);
  return (
    <p className="mt-4 text-center font-mono text-xs text-gold-400">
      {remaining === 0 ? "Reservierung abgelaufen" : `Plätze reserviert für ${formatDuration(remaining)}`}
    </p>
  );
}

// checkouts/show.html.erb – Bestaetigung, Zahlungsauswahl und simulierte Zahlung (FA-Opt-2)
export function Checkout() {
  const { showtimeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { flashNext } = useFlash();
  const handleError = useApiErrorHandler();

  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState("confirm");
  const [method, setMethod] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api(`/showtimes/${showtimeId}/checkout${location.search}`)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setMethod(result.payment_methods[0]);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 422) {
          flashNext({ alert: error.body.alert });
          navigate(`/showtimes/${showtimeId}`, { replace: true });
        } else if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
        } else {
          handleError(error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showtimeId, location.search, flashNext, navigate, handleError]);

  async function book() {
    try {
      const result = await api("/bookings", {
        method: "POST",
        body: { showtime_id: data.showtime.id, seat_ids: data.seats.map((seat) => seat.id), payment_method: method.value }
      });
      flashNext({ notice: result.notice });
      navigate("/bookings");
    } catch (error) {
      if (error instanceof ApiError && error.body.showtime_id) {
        flashNext({ alert: error.body.alert });
        navigate(`/showtimes/${error.body.showtime_id}`);
      } else {
        setStep("payment");
        handleError(error);
      }
    }
  }

  // Zeigt die Verarbeitung an und sendet die Buchung erst danach ab.
  function pay(event) {
    event.preventDefault();
    setStep("processing");
    setTimeout(book, PROCESSING_DELAY);
  }

  if (notFound) return <NotFound />;
  if (!data) return null;

  const { showtime, seats } = data;

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={pay}>
        {/* Schritt 1: Buchung bestaetigen */}
        <section className={`ka-card p-6 ${step === "confirm" ? "" : "hidden"}`}>
          <div className="flex items-start justify-between">
            <h1 className="text-2xl">Buchung bestätigen</h1>
            <Link to={`/showtimes/${showtime.id}`} className="text-slate-500 transition hover:text-white">
              <CrossIcon className="h-5 w-5" />
              <span className="sr-only">Abbrechen</span>
            </Link>
          </div>

          <div className="mt-5 flex gap-4 rounded-lg border border-white/10 bg-ink-700/50 p-4">
            {showtime.movie.poster_url && (
              <img src={showtime.movie.poster_url} alt={showtime.movie.title} className="h-24 w-16 shrink-0 rounded object-cover" />
            )}

            <div>
              <h2 className="text-lg">{showtime.movie.title}</h2>
              <p className="ka-label mt-1 normal-case tracking-normal">
                {showtimeDate(showtime.start_time)} &middot; {timeOfDay(showtime.start_time)}
              </p>
              <p className="text-sm text-slate-400">{showtime.auditorium.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {seats.map((seat) => <span key={seat.id} className="ka-chip">{seat.label}</span>)}
              </div>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-white/5 rounded-lg border border-white/10">
            <div className="flex justify-between px-4 py-3 text-sm">
              <dt className="text-slate-400">{pluralize(seats.length, "Ticket", "Tickets")}</dt>
              <dd className="font-mono text-slate-200">{chf(data.subtotal)}</dd>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <dt className="text-slate-400">Buchungsgebühr</dt>
              <dd className="font-mono text-slate-200">{chf(data.booking_fee)}</dd>
            </div>
            <div className="flex items-baseline justify-between px-4 py-3">
              <dt className="font-medium text-white">Total</dt>
              <dd className="font-display text-2xl text-gold-400">{chf(data.total)}</dd>
            </div>
          </dl>

          {data.hold_expires_at && <HoldTimer expiresAt={data.hold_expires_at} />}

          <div className="mt-6 flex gap-3">
            <Link to={`/showtimes/${showtime.id}`} className="ka-btn-ghost flex-1">Abbrechen</Link>
            <button type="button" onClick={() => setStep("payment")} className="ka-btn-primary flex-1">
              Weiter zur Zahlung →
            </button>
          </div>
        </section>

        {/* Schritt 2: Zahlungsmethode */}
        <section className={`ka-card mt-6 p-6 ${step === "payment" ? "" : "hidden"}`}>
          <button type="button" onClick={() => setStep("confirm")} className="ka-label transition hover:text-white">
            ← Zurück
          </button>

          <h2 className="mt-4 text-2xl">Zahlungsmethode</h2>
          <p className="mt-1 text-sm text-slate-400">Wähle aus, wie du {chf(data.total)} bezahlen möchtest.</p>

          <div className="mt-5 space-y-3">
            {data.payment_methods.map((option) => (
              <label key={option.value}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-ink-700/50 p-4 transition has-[:checked]:border-brand-500 has-[:checked]:bg-brand-500/10">
                <input
                  type="radio"
                  name="payment_method"
                  value={option.value}
                  checked={method?.value === option.value}
                  onChange={() => setMethod(option)}
                  className="h-4 w-4 border-white/20 bg-ink-700 text-brand-500 focus:ring-brand-500"
                />
                <span>
                  <span className="block font-medium text-white">{option.label}</span>
                  <span className="block text-xs text-slate-400">{PAYMENT_SUBTITLES[option.value]}</span>
                </span>
              </label>
            ))}
          </div>

          <button type="submit" className="mt-6 w-full rounded-lg bg-white py-3.5 font-medium text-ink-950 transition hover:bg-slate-200">
            mit {method?.label} bezahlen
          </button>
        </section>

        {/* Schritt 3: Verarbeitung */}
        <section className={`ka-card mt-6 p-12 text-center ${step === "processing" ? "" : "hidden"}`}>
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-ink-600 border-t-brand-500 motion-safe:animate-spin" />
          <h2 className="mt-6 text-2xl">Zahlung wird verarbeitet</h2>
          <p className="mt-2 text-sm text-slate-400">{method ? `${method.label} wird bestätigt` : "Bitte einen Moment Geduld"}</p>
        </section>
      </form>
    </div>
  );
}
