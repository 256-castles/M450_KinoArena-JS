import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api.js";
import { Brand } from "../components/Brand.jsx";
import { useFlash } from "../context/FlashContext.jsx";
import { useAction } from "../hooks/useAction.js";

// password_resets/new.html.erb
export function PasswordResetNew() {
  const { flashNext } = useFlash();
  const navigate = useNavigate();
  const { run, pending } = useAction();
  const [emailAddress, setEmailAddress] = useState("");

  async function submit(event) {
    event.preventDefault();
    const data = await run(() => api("/password_resets", { method: "POST", body: { email_address: emailAddress } }));
    if (!data) return;

    flashNext({ notice: data.notice });
    navigate("/login");
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="ka-card p-8">
        <Brand />

        <h1 className="mt-6 font-display text-lg text-white">Passwort vergessen</h1>
        <p className="mt-2 text-sm text-slate-400">
          Gib deine E-Mail-Adresse ein. Wir senden dir einen Link, mit dem du ein neues
          Passwort setzen kannst.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email_address" className="ka-label normal-case tracking-normal">E-Mail</label>
            <input id="email_address" type="email" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)}
              required autoFocus placeholder="anna@example.ch" className="ka-input" />
          </div>

          <button type="submit" disabled={pending} className="ka-btn-primary w-full py-3">Link anfordern</button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          <Link to="/login" className="text-brand-500 transition hover:text-brand-400">Zurück zur Anmeldung</Link>
        </p>
      </div>
    </div>
  );
}
