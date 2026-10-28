import { Link } from "react-router";
import { api } from "../api.js";
import { Underline } from "../components/Brand.jsx";
import { useFlash } from "../context/FlashContext.jsx";
import { useAction } from "../hooks/useAction.js";
import { useResource } from "../hooks/useResource.js";
import { dateLabel } from "../lib/format.js";

// users/index.html.erb – Benutzerverwaltung (nur Administratoren)
export function UsersIndex() {
  const { data, reload } = useResource("/users");
  const { flashNow } = useFlash();
  const { run } = useAction();

  async function destroy(user) {
    if (!window.confirm(`Konto ${user.email_address} wirklich löschen?`)) return;
    const result = await run(() => api(`/users/${user.id}`, { method: "DELETE" }));
    if (!result) return;
    flashNow({ notice: result.notice });
    reload();
  }

  if (!data) return null;

  return (
    <>
      <h1 className="text-4xl">Benutzerverwaltung</h1>
      <Underline />

      <div className="ka-card mt-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ka-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>E-Mail</th>
                <th>Rolle</th>
                <th>Tickets</th>
                <th>Registriert</th>
                <th className="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="transition hover:bg-white/[0.02]">
                  <td><Link to={`/users/${user.id}`} className="text-white transition hover:text-brand-400">{user.name}</Link></td>
                  <td className="font-mono text-xs text-slate-400">{user.email_address}</td>
                  <td>
                    {user.admin ? (
                      <span className="ka-chip">Administrator</span>
                    ) : (
                      <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-xs text-slate-400">Kunde</span>
                    )}
                  </td>
                  <td className="text-slate-400">{user.bookings_count}</td>
                  <td className="text-slate-500">{dateLabel(user.created_at)}</td>
                  <td>
                    <div className="flex justify-end gap-3 text-xs">
                      <Link to={`/users/${user.id}/edit`} className="text-slate-400 underline transition hover:text-white">Bearbeiten</Link>
                      {user.can_destroy && (
                        <button type="button" onClick={() => destroy(user)} className="text-brand-400 underline transition hover:text-brand-300">
                          Löschen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
