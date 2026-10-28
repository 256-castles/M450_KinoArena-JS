import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api.js";
import { Brand } from "../components/Brand.jsx";
import { ErrorList } from "../components/ErrorList.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useFlash } from "../context/FlashContext.jsx";
import { useAction } from "../hooks/useAction.js";

// registrations/new.html.erb
export function Signup() {
  const { setUser } = useAuth();
  const { flashNext } = useFlash();
  const navigate = useNavigate();
  const { run, errorMessages, pending } = useAction();
  const [form, setForm] = useState({ name: "", email_address: "", password: "", password_confirmation: "" });

  async function submit(event) {
    event.preventDefault();
    const data = await run(() => api("/registrations", { method: "POST", body: { user: form } }));
    if (!data) return;

    setUser(data.user);
    flashNext({ notice: data.notice });
    navigate("/");
  }

  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <div className="mx-auto max-w-sm">
      <div className="ka-card p-8">
        <Brand />

        <p className="mt-4 text-sm text-slate-400">Konto erstellen und Tickets sichern.</p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-ink-700 p-1 text-sm">
          <Link to="/login" className="rounded-md py-2 text-center text-slate-400 transition hover:text-white">Anmelden</Link>
          <span className="rounded-md bg-brand-500 py-2 text-center font-medium text-white">Registrieren</span>
        </div>

        <div className="mt-6">
          <ErrorList messages={errorMessages} />

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="user_name" className="ka-label normal-case tracking-normal">Name</label>
              <input id="user_name" type="text" value={form.name} onChange={change("name")} required autoFocus
                placeholder="Anna Muster" className="ka-input" />
            </div>

            <div>
              <label htmlFor="user_email_address" className="ka-label normal-case tracking-normal">E-Mail</label>
              <input id="user_email_address" type="email" value={form.email_address} onChange={change("email_address")}
                required placeholder="anna@example.ch" className="ka-input" />
            </div>

            <div>
              <label htmlFor="user_password" className="ka-label normal-case tracking-normal">Passwort</label>
              <input id="user_password" type="password" value={form.password} onChange={change("password")} required
                placeholder="mindestens 8 Zeichen" className="ka-input" />
            </div>

            <div>
              <label htmlFor="user_password_confirmation" className="ka-label normal-case tracking-normal">Passwort wiederholen</label>
              <input id="user_password_confirmation" type="password" value={form.password_confirmation}
                onChange={change("password_confirmation")} required placeholder="••••••••" className="ka-input" />
            </div>

            <button type="submit" disabled={pending} className="ka-btn-primary w-full py-3">Konto erstellen</button>
          </form>
        </div>
      </div>
    </div>
  );
}
