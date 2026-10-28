import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { queryString } from "../../api.js";
import { Underline } from "../../components/Brand.jsx";
import { useResource } from "../../hooks/useResource.js";
import { timestamp } from "../../lib/format.js";

function FilterForm({ actions, users, initial, onSubmit }) {
  const [filter, setFilter] = useState(initial);

  function submit(event) {
    event.preventDefault();
    onSubmit(filter);
  }

  return (
    <form onSubmit={submit} className="ka-card mt-8 flex flex-wrap items-end gap-4 p-5">
      <div>
        <label htmlFor="action_filter" className="ka-label normal-case tracking-normal">Aktion</label>
        <select id="action_filter" value={filter.action_filter} onChange={(event) => setFilter({ ...filter, action_filter: event.target.value })}
          className="ka-input min-w-48">
          <option value="">Alle Aktionen</option>
          {actions.map((action) => <option key={action} value={action}>{action}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="user_id" className="ka-label normal-case tracking-normal">Benutzer</label>
        <select id="user_id" value={filter.user_id} onChange={(event) => setFilter({ ...filter, user_id: event.target.value })}
          className="ka-input min-w-56">
          <option value="">Alle Benutzer</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.email_address}</option>)}
        </select>
      </div>

      <button type="submit" className="ka-btn-primary text-sm">Filtern</button>
      <Link to="/admin/activity_logs" className="ka-label transition hover:text-white">Zurücksetzen</Link>
    </form>
  );
}

// admin/activity_logs/index.html.erb – Aktivitaetsprotokoll (FA-9)
export function ActivityLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = {
    action_filter: searchParams.get("action_filter") ?? "",
    user_id: searchParams.get("user_id") ?? ""
  };
  const query = queryString(filter);
  const { data } = useResource(`/admin/activity_logs${query}`);

  if (!data) return null;

  return (
    <>
      <h1 className="text-4xl">Aktivitätsprotokoll</h1>
      <Underline />

      <FilterForm key={query} actions={data.actions} users={data.users} initial={filter}
        onSubmit={(values) => setSearchParams(Object.fromEntries(Object.entries(values).filter(([, value]) => value)))} />

      <div className="ka-card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ka-table">
            <thead>
              <tr>
                <th>Zeitpunkt</th>
                <th>Benutzer</th>
                <th>Aktion</th>
                <th>Objekt</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-slate-500">Keine Einträge gefunden.</td></tr>
              )}

              {data.logs.map((log) => (
                <tr key={log.id} className="transition hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap font-mono text-xs text-slate-500">{timestamp(log.created_at)}</td>
                  <td className="font-mono text-xs text-slate-400">{log.actor_name}</td>
                  <td>
                    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-slate-500">{log.target_label}</td>
                  <td className="text-xs text-slate-400">{log.description}</td>
                  <td className="font-mono text-xs text-slate-600">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="ka-label mt-4">Es werden maximal die 200 neuesten Einträge angezeigt.</p>
    </>
  );
}
