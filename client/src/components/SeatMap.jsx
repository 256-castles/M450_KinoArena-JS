import { useEffect, useEffectEvent, useState } from "react";
import { useNavigate } from "react-router";
import { api, queryString } from "../api.js";
import { useSeatStream } from "../hooks/useSeatStream.js";
import {
  applySeatUpdate,
  classesFor,
  earliestExpiry,
  formatDuration,
  formatPrice,
  groupByRow,
  mySeats,
  remainingSeconds,
  seatNumbers,
  seatTitle,
  stateOf,
  submitLabel
} from "../lib/seatMapState.js";
import { CrossIcon } from "./Brand.jsx";

function LockIcon({ hidden }) {
  return (
    <svg className={`${hidden ? "hidden " : ""}h-3 w-3`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2a3 3 0 00-3 3v2H6a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1h-1V5a3 3 0 00-3-3zm-1 5V5a1 1 0 112 0v2H9z" />
    </svg>
  );
}

// showtimes/_seat.html.erb
function Seat({ seat, state, loggedIn, onToggle }) {
  if (state === "booked") {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-t-md rounded-b-sm bg-ink-900 text-slate-700 ring-1 ring-inset ring-white/5"
        title={`Platz ${seat.label} ist bereits gebucht`}
      >
        <CrossIcon className="h-3 w-3" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(seat)}
      disabled={!loggedIn || state === "other"}
      title={seatTitle(seat, state)}
      className={`flex h-7 w-7 items-center justify-center rounded-t-md rounded-b-sm transition ${classesFor(state).join(" ")}`}
    >
      <span className="sr-only">Platz {seat.label}</span>
      <LockIcon hidden={state !== "other"} />
    </button>
  );
}

// Saalplan mit temporaerer Reservierung (FA-Opt-1) und Live-Updates (Portierung von seat_map_controller.js).
export function SeatMap({ showtime, initialSeats, holdDurationMinutes, currentUserId }) {
  const navigate = useNavigate();
  const loggedIn = Boolean(currentUserId);
  const [seats, setSeats] = useState(initialSeats);
  const [notice, setNotice] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const holdUrl = `/showtimes/${showtime.id}/seat_holds`;
  const selected = mySeats(seats, currentUserId);
  const expiresAt = earliestExpiry(selected);
  const remaining = expiresAt === null ? null : remainingSeconds(expiresAt, now);

  useSeatStream(showtime.id, (update) => setSeats((current) => applySeatUpdate(current, update)));

  function updateSeat(seatId, changes) {
    setSeats((current) => current.map((seat) => (seat.id === seatId ? { ...seat, ...changes } : seat)));
  }

  async function hold(seat) {
    try {
      const data = await api(holdUrl, { method: "POST", body: { seat_id: seat.id } });
      updateSeat(seat.id, { holder_id: currentUserId, expires_at: data.expires_at });
      setNotice(null);
    } catch (error) {
      setNotice(error.body?.error || "Dieser Platz ist nicht mehr verfügbar.");
    }
  }

  async function release(seat) {
    await api(`${holdUrl}/${seat.id}`, { method: "DELETE" }).catch(() => {});
    updateSeat(seat.id, { holder_id: null, expires_at: null });
  }

  async function toggle(seat) {
    if (!loggedIn) return;
    const state = stateOf(seat, currentUserId);
    if (state === "other") return;
    if (state === "mine") await release(seat);
    else await hold(seat);
  }

  // Jede Sekunde: Countdown aktualisieren und abgelaufene Reservierungen freigeben
  const tick = useEffectEvent((current) => {
    setNow(current);

    const expiry = earliestExpiry(selected);
    if (expiry !== null && remainingSeconds(expiry, current) === 0) {
      for (const seat of selected) release(seat);
      setNotice("Deine Reservierung ist abgelaufen. Bitte wähle die Plätze erneut.");
    }
  });

  useEffect(() => {
    const ticker = setInterval(() => tick(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  function submit(event) {
    event.preventDefault();
    if (selected.length === 0) return;
    navigate(`/showtimes/${showtime.id}/checkout${queryString({ seat_ids: selected.map((seat) => seat.id) })}`);
  }

  return (
    <>
      {notice && (
        <div className="mt-6 rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-center text-sm text-brand-300">
          {notice}
        </div>
      )}

      <form onSubmit={submit}>
        <div className="mt-10 overflow-x-auto">
          <div className="mx-auto w-fit space-y-2">
            {groupByRow(seats).map(([row, rowSeats]) => (
              <div key={row} className="flex items-center gap-3">
                <span className="w-4 font-mono text-xs text-slate-500">{row}</span>
                <div className="flex gap-1.5">
                  {rowSeats.map((seat) => (
                    <Seat key={seat.id} seat={seat} state={stateOf(seat, currentUserId)} loggedIn={loggedIn} onToggle={toggle} />
                  ))}
                </div>
                <span className="w-4 font-mono text-xs text-slate-500">{row}</span>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-1">
              <span className="w-4" />
              <div className="flex gap-1.5">
                {seatNumbers(seats).map((number) => (
                  <span key={number} className="w-7 text-center font-mono text-[10px] text-slate-600">{number}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-sm bg-slate-600 ring-1 ring-inset ring-white/20" /> Frei
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-sm bg-brand-500" /> Deine Auswahl
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-sm bg-gold-400" /> Wird gerade reserviert
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-ink-900 ring-1 ring-inset ring-white/5">
              <CrossIcon className="h-2 w-2 text-slate-700" />
            </span>{" "}
            Bereits gebucht
          </span>
        </div>

        <div className="ka-card mt-10 p-5">
          {selected.length > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-gold-400/30 bg-gold-400/10 px-4 py-3">
              <svg className="h-5 w-5 text-gold-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.4.8l2.5 1.9a1 1 0 101.2-1.6L11 9.5V6z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="ka-label">Plätze reserviert für</p>
                <p className="font-mono text-xl text-gold-400">{formatDuration(remaining ?? holdDurationMinutes * 60)}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="ka-label">Ausgewählte Plätze</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.length > 0 ? (
                  selected.map((seat) => <span key={seat.id} className="ka-chip">{seat.label}</span>)
                ) : (
                  <span className="text-sm text-slate-500">Noch keine Plätze gewählt</span>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="font-display text-3xl text-gold-400">{formatPrice(selected.length * showtime.price)}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {selected.length} × {formatPrice(showtime.price)}
              </p>
            </div>
          </div>

          <button type="submit" id="submit-booking" disabled={!loggedIn || selected.length === 0}
            className="ka-btn-primary mt-5 w-full py-3.5 text-base">
            {submitLabel(selected.length)}
          </button>

          <p className="mt-3 text-center text-xs text-slate-500">
            Deine Plätze bleiben {holdDurationMinutes} Minuten reserviert,
            bis die Zahlung abgeschlossen ist.
          </p>
        </div>
      </form>
    </>
  );
}
