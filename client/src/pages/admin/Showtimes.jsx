import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../api.js";
import { Underline } from "../../components/Brand.jsx";
import { ErrorList } from "../../components/ErrorList.jsx";
import { useFlash } from "../../context/FlashContext.jsx";
import { useAction } from "../../hooks/useAction.js";
import { useResource } from "../../hooks/useResource.js";
import { chf, dateTimeLocalValue, showtimeDate, timeOfDay } from "../../lib/format.js";
import { NotFound } from "../NotFound.jsx";

// admin/showtimes/index.html.erb – Spielplanverwaltung (FA-6)
export function ShowtimesAdminIndex() {
  const { data, reload } = useResource("/admin/showtimes");
  const { flashNow } = useFlash();
  const { run } = useAction();

  async function destroy(showtime) {
    if (!window.confirm("Vorstellung wirklich löschen? Alle Buchungen werden entfernt.")) return;
    const result = await run(() => api(`/admin/showtimes/${showtime.id}`, { method: "DELETE" }));
    if (!result) return;
    flashNow({ notice: result.notice });
    reload();
  }

  if (!data) return null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl">Spielplanverwaltung</h1>
          <Underline />
        </div>
        <Link to="/admin/showtimes/new" className="ka-btn-primary text-sm">Neue Vorstellung</Link>
      </div>

      <div className="ka-card mt-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ka-table">
            <thead>
              <tr>
                <th>Film</th>
                <th>Saal</th>
                <th>Beginn</th>
                <th>Preis</th>
                <th>Auslastung</th>
                <th>Version</th>
                <th className="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {data.showtimes.map((showtime) => {
                const booked = showtime.booked_seats;
                const total = showtime.total_seats;
                return (
                  <tr key={showtime.id} className="transition hover:bg-white/[0.02]">
                    <td className="text-white">{showtime.movie.title}</td>
                    <td className="text-slate-400">{showtime.auditorium.name}</td>
                    <td className="font-mono text-xs text-slate-400">
                      {showtimeDate(showtime.start_time)} · {timeOfDay(showtime.start_time)}
                    </td>
                    <td className="font-mono text-xs text-gold-400">{chf(showtime.price)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-ink-600">
                          <div className="h-full bg-brand-500" style={{ width: `${total === 0 ? 0 : Math.floor((booked * 100) / total)}%` }} />
                        </div>
                        <span className="font-mono text-xs text-slate-500">{booked}/{total}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-slate-600">v{showtime.lock_version}</td>
                    <td>
                      <div className="flex justify-end gap-3 text-xs">
                        <Link to={`/admin/showtimes/${showtime.id}/edit`} className="text-slate-400 underline transition hover:text-white">
                          Bearbeiten
                        </Link>
                        <button type="button" onClick={() => destroy(showtime)} className="text-brand-400 underline transition hover:text-brand-300">
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// admin/showtimes/_form.html.erb
function ShowtimeForm({ showtime, movies, auditoria, submitLabel }) {
  const navigate = useNavigate();
  const { flashNext } = useFlash();
  const { run, errorMessages, pending } = useAction();
  const [form, setForm] = useState({
    movie_id: showtime?.movie_id ?? "",
    auditorium_id: showtime?.auditorium_id ?? "",
    // datetime-local ohne Zeitzone; der Server interpretiert den Wert als Zuercher Ortszeit
    start_time: dateTimeLocalValue(showtime?.start_time),
    price: showtime?.price ?? ""
  });

  async function submit(event) {
    event.preventDefault();
    // NFA-2: lock_version wird mitgesendet und vom Server geprueft
    const request = showtime
      ? api(`/admin/showtimes/${showtime.id}`, { method: "PATCH", body: { showtime: { ...form, lock_version: showtime.lock_version } } })
      : api("/admin/showtimes", { method: "POST", body: { showtime: form } });
    const result = await run(() => request);
    if (!result) return;

    flashNext({ notice: result.notice });
    navigate("/admin/showtimes");
  }

  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <>
      <ErrorList messages={errorMessages} />

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="showtime_movie_id" className="ka-label normal-case tracking-normal">Film</label>
          <select id="showtime_movie_id" value={form.movie_id} onChange={change("movie_id")} className="ka-input">
            <option value="">Bitte wählen</option>
            {movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="showtime_auditorium_id" className="ka-label normal-case tracking-normal">Saal</label>
          <select id="showtime_auditorium_id" value={form.auditorium_id} onChange={change("auditorium_id")} className="ka-input">
            <option value="">Bitte wählen</option>
            {auditoria.map((auditorium) => <option key={auditorium.id} value={auditorium.id}>{auditorium.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="showtime_start_time" className="ka-label normal-case tracking-normal">Beginn</label>
            <input id="showtime_start_time" type="datetime-local" value={form.start_time} onChange={change("start_time")} className="ka-input" />
          </div>

          <div>
            <label htmlFor="showtime_price" className="ka-label normal-case tracking-normal">Preis (CHF)</label>
            <input id="showtime_price" type="number" step={0.05} value={form.price} onChange={change("price")} className="ka-input" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending} className="ka-btn-primary">{submitLabel}</button>
          <Link to="/admin/showtimes" className="ka-btn-ghost">Abbrechen</Link>
        </div>
      </form>
    </>
  );
}

// admin/showtimes/new.html.erb
export function ShowtimeNew() {
  const { data } = useResource("/admin/showtimes/new");
  if (!data) return null;

  return (
    <div className="mx-auto max-w-xl">
      <div className="ka-card p-8">
        <h1 className="text-2xl">Neue Vorstellung</h1>
        <Underline className="mt-2 mb-6" />
        <ShowtimeForm movies={data.movies} auditoria={data.auditoria} submitLabel="Vorstellung anlegen" />
      </div>
    </div>
  );
}

// admin/showtimes/edit.html.erb
export function ShowtimeEdit() {
  const { id } = useParams();
  const { data, notFound } = useResource(`/admin/showtimes/${id}`);
  if (notFound) return <NotFound />;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-xl">
      <div className="ka-card p-8">
        <h1 className="text-2xl">Vorstellung bearbeiten</h1>
        <Underline className="mt-2 mb-6" />
        <ShowtimeForm key={data.showtime.id} showtime={data.showtime} movies={data.movies} auditoria={data.auditoria}
          submitLabel="Änderungen speichern" />
      </div>
    </div>
  );
}
