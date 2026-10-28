import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../api.js";
import { Underline } from "../components/Brand.jsx";
import { ErrorList } from "../components/ErrorList.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useFlash } from "../context/FlashContext.jsx";
import { useAction } from "../hooks/useAction.js";
import { useResource } from "../hooks/useResource.js";
import { NotFound } from "./NotFound.jsx";

function UserForm({ user }) {
  const { user: currentUser, refresh } = useAuth();
  const { flashNext } = useFlash();
  const navigate = useNavigate();
  const { run, errorMessages, pending } = useAction();
  const [form, setForm] = useState({
    name: user.name,
    email_address: user.email_address,
    password: "",
    password_confirmation: "",
    admin: user.admin
  });

  async function submit(event) {
    event.preventDefault();
    const { admin, ...fields } = form;
    // Das Feld "admin" wird nur mitgeschickt, wenn die Rolle geaendert werden darf.
    const payload = user.can_change_role ? { ...fields, admin } : fields;
    const result = await run(() => api(`/users/${user.id}`, { method: "PATCH", body: { user: payload } }));
    if (!result) return;

    if (user.id === currentUser.id) await refresh();
    flashNext({ notice: result.notice });
    navigate(`/users/${user.id}`);
  }

  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <>
      <ErrorList messages={errorMessages} />

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="user_name" className="ka-label normal-case tracking-normal">Name</label>
          <input id="user_name" type="text" value={form.name} onChange={change("name")} className="ka-input" />
        </div>

        <div>
          <label htmlFor="user_email_address" className="ka-label normal-case tracking-normal">E-Mail</label>
          <input id="user_email_address" type="email" value={form.email_address} onChange={change("email_address")} className="ka-input" />
        </div>

        <div className="border-t border-white/5 pt-5">
          <p className="text-xs text-slate-500">Passwort nur ausfüllen, wenn du es ändern möchtest.</p>

          <div className="mt-3">
            <label htmlFor="user_password" className="ka-label normal-case tracking-normal">Neues Passwort</label>
            <input id="user_password" type="password" autoComplete="new-password" value={form.password}
              onChange={change("password")} className="ka-input" />
          </div>

          <div className="mt-3">
            <label htmlFor="user_password_confirmation" className="ka-label normal-case tracking-normal">Wiederholen</label>
            <input id="user_password_confirmation" type="password" autoComplete="new-password" value={form.password_confirmation}
              onChange={change("password_confirmation")} className="ka-input" />
          </div>
        </div>

        {user.can_change_role && (
          <label className="flex items-center gap-2.5 border-t border-white/5 pt-5 text-sm text-slate-300">
            <input type="checkbox" checked={form.admin} onChange={(event) => setForm({ ...form, admin: event.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-ink-700 text-brand-500 focus:ring-brand-500" />
            Administratorrechte vergeben
          </label>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending} className="ka-btn-primary flex-1">Speichern</button>
          <Link to={`/users/${user.id}`} className="ka-btn-ghost flex-1">Abbrechen</Link>
        </div>
      </form>
    </>
  );
}

// users/edit.html.erb – Profil bearbeiten
export function UserEdit() {
  const { id } = useParams();
  const { data, notFound } = useResource(`/users/${id}`);

  if (notFound) return <NotFound />;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-md">
      <div className="ka-card p-8">
        <h1 className="text-2xl">Profil bearbeiten</h1>
        <Underline className="mt-2 mb-6" />
        <UserForm key={data.user.id} user={data.user} />
      </div>
    </div>
  );
}
