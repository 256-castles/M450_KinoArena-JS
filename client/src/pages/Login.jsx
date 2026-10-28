import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api.js";
import { Brand } from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useFlash } from "../context/FlashContext.jsx";
import { useAction } from "../hooks/useAction.js";

// sessions/new.html.erb
export function Login() {
  const { setUser } = useAuth();
  const { flashNext } = useFlash();
  const navigate = useNavigate();
  const { run, pending } = useAction();
  const [form, setForm] = useState({ email_address: "", password: "" });

  async function submit(event) {
    event.preventDefault();
    const data = await run(() => api("/session", { method: "POST", body: form }));
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

        <p className="mt-4 text-sm text-slate-400">Willkommen zurück.</p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-ink-700 p-1 text-sm">
          <span className="rounded-md bg-brand-500 py-2 text-center font-medium text-white">Anmelden</span>
          <Link to="/signup" className="rounded-md py-2 text-center text-slate-400 transition hover:text-white">Registrieren</Link>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email_address" className="ka-label normal-case tracking-normal">E-Mail</label>
            <input
              id="email_address"
              type="email"
              value={form.email_address}
              onChange={change("email_address")}
              required
              autoFocus
              placeholder="anna@example.ch"
              className="ka-input"
            />
          </div>

          <div>
            <label htmlFor="password" className="ka-label normal-case tracking-normal">Passwort</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={change("password")}
              required
              placeholder="••••••••"
              className="ka-input"
            />
          </div>

          <button type="submit" disabled={pending} className="ka-btn-primary w-full py-3">Anmelden</button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link to="/password_resets/new" className="text-slate-400 transition hover:text-brand-500">Passwort vergessen?</Link>
        </p>

        {import.meta.env.DEV && (
          <p className="mt-5 text-center font-mono text-xs text-gold-400">Demo: admin@kinoarena.test / password123</p>
        )}
      </div>
    </div>
  );
}
