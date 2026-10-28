import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../api.js";
import { Underline } from "../../components/Brand.jsx";
import { ErrorList } from "../../components/ErrorList.jsx";
import { useFlash } from "../../context/FlashContext.jsx";
import { useAction } from "../../hooks/useAction.js";
import { useResource } from "../../hooks/useResource.js";
import { NotFound } from "../NotFound.jsx";

const MAX_ROWS = 26;
const MAX_SEATS_PER_ROW = 40;

// admin/auditoria/index.html.erb – Saalverwaltung (FA-6)
export function AuditoriaIndex() {
  const { data, reload } = useResource("/admin/auditoria");
  const { flashNow } = useFlash();
  const { run } = useAction();

  async function destroy(auditorium) {
    if (!window.confirm(`Saal "${auditorium.name}" wirklich löschen?`)) return;
    const result = await run(() => api(`/admin/auditoria/${auditorium.id}`, { method: "DELETE" }));
    if (!result) return;
    flashNow({ notice: result.notice });
    reload();
  }

  if (!data) return null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl">Saalverwaltung</h1>
          <Underline />
        </div>
        <Link to="/admin/auditoria/new" className="ka-btn-primary text-sm">Neuer Saal</Link>
      </div>

      <div className="ka-card mt-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ka-table">
            <thead>
              <tr>
                <th>Saal</th>
                <th>Reihen</th>
                <th>Sitzplätze</th>
                <th>Vorstellungen</th>
                <th>Gebuchte Plätze</th>
                <th className="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {data.auditoria.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">Noch keine Säle angelegt.</td></tr>
              )}

              {data.auditoria.map((auditorium) => (
                <tr key={auditorium.id} className="transition hover:bg-white/[0.02]">
                  <td className="text-white">{auditorium.name}</td>
                  <td className="font-mono text-xs text-slate-400">{auditorium.rows.join(", ")}</td>
                  <td className="text-slate-400">{auditorium.seats_count}</td>
                  <td className="text-slate-400">{auditorium.showtimes_count}</td>
                  <td className="text-slate-400">{auditorium.booked_seat_count}</td>
                  <td>
                    <div className="flex justify-end gap-3 text-xs">
                      <Link to={`/admin/auditoria/${auditorium.id}/edit`} className="text-slate-400 underline transition hover:text-white">
                        Umbenennen
                      </Link>
                      <button type="button" onClick={() => destroy(auditorium)} className="text-brand-400 underline transition hover:text-brand-300">
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="ka-label mt-4">Säle mit geplanten Vorstellungen können nicht gelöscht werden.</p>
    </>
  );
}

// admin/auditoria/new.html.erb
export function AuditoriumNew() {
  const navigate = useNavigate();
  const { flashNext } = useFlash();
  const { run, errorMessages, pending } = useAction();
  const [form, setForm] = useState({ name: "", row_count: 8, seats_per_row: 12 });

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => api("/admin/auditoria", { method: "POST", body: { auditorium: form } }));
    if (!result) return;
    flashNext({ notice: result.notice });
    navigate("/admin/auditoria");
  }

  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <div className="mx-auto max-w-xl">
      <div className="ka-card p-8">
        <h1 className="text-2xl">Neuer Saal</h1>
        <Underline className="mt-2 mb-6" />

        <ErrorList messages={errorMessages} />

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="auditorium_name" className="ka-label normal-case tracking-normal">Bezeichnung</label>
            <input id="auditorium_name" type="text" value={form.name} onChange={change("name")} placeholder="Saal 3 – Lounge" className="ka-input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="auditorium_row_count" className="ka-label normal-case tracking-normal">Anzahl Reihen</label>
              <input id="auditorium_row_count" type="number" min={1} max={MAX_ROWS} value={form.row_count}
                onChange={change("row_count")} className="ka-input" />
            </div>

            <div>
              <label htmlFor="auditorium_seats_per_row" className="ka-label normal-case tracking-normal">Plätze pro Reihe</label>
              <input id="auditorium_seats_per_row" type="number" min={1} max={MAX_SEATS_PER_ROW} value={form.seats_per_row}
                onChange={change("seats_per_row")} className="ka-input" />
            </div>
          </div>

          <p className="rounded-lg border border-white/10 bg-ink-700/50 px-4 py-3 text-xs text-slate-400">
            Die Reihen werden automatisch mit A, B, C … benannt und die Sitzplätze fortlaufend nummeriert.
            Der Saalplan lässt sich später nicht mehr ändern, damit bestehende Buchungen gültig bleiben.
          </p>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={pending} className="ka-btn-primary">Saal anlegen</button>
            <Link to="/admin/auditoria" className="ka-btn-ghost">Abbrechen</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenameForm({ auditorium }) {
  const navigate = useNavigate();
  const { flashNext } = useFlash();
  const { run, errorMessages, pending } = useAction();
  const [name, setName] = useState(auditorium.name);

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => api(`/admin/auditoria/${auditorium.id}`, { method: "PATCH", body: { auditorium: { name } } }));
    if (!result) return;
    flashNext({ notice: result.notice });
    navigate("/admin/auditoria");
  }

  return (
    <>
      <ErrorList messages={errorMessages} />

      <dl className="mb-6 grid grid-cols-3 gap-4 rounded-lg border border-white/10 bg-ink-700/50 p-4 text-sm">
        <div>
          <dt className="ka-label">Reihen</dt>
          <dd className="mt-1 text-slate-200">{auditorium.rows.length}</dd>
        </div>
        <div>
          <dt className="ka-label">Sitzplätze</dt>
          <dd className="mt-1 text-slate-200">{auditorium.seats_count}</dd>
        </div>
        <div>
          <dt className="ka-label">Gebucht</dt>
          <dd className="mt-1 text-slate-200">{auditorium.booked_seat_count}</dd>
        </div>
      </dl>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="auditorium_name" className="ka-label normal-case tracking-normal">Bezeichnung</label>
          <input id="auditorium_name" type="text" value={name} onChange={(event) => setName(event.target.value)} className="ka-input" />
        </div>

        <p className="text-xs text-slate-500">
          Der Saalplan kann nicht nachträglich verändert werden, da sonst bestehende Buchungen ungültig würden.
        </p>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending} className="ka-btn-primary">Speichern</button>
          <Link to="/admin/auditoria" className="ka-btn-ghost">Abbrechen</Link>
        </div>
      </form>
    </>
  );
}

// admin/auditoria/edit.html.erb
export function AuditoriumEdit() {
  const { id } = useParams();
  const { data, notFound } = useResource(`/admin/auditoria/${id}`);
  if (notFound) return <NotFound />;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-xl">
      <div className="ka-card p-8">
        <h1 className="text-2xl">Saal umbenennen</h1>
        <Underline className="mt-2 mb-6" />
        <RenameForm key={data.auditorium.id} auditorium={data.auditorium} />
      </div>
    </div>
  );
}
