import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api, ApiError } from "../api.js";
import { Brand } from "../components/Brand.jsx";
import { ErrorList } from "../components/ErrorList.jsx";
import { useFlash } from "../context/FlashContext.jsx";
import { useAction } from "../hooks/useAction.js";

// Abgelaufener oder bereits benutzter Link -> zurueck zum Anforderungsformular
function isInvalidLink(error) {
  return error instanceof ApiError && error.status === 410;
}

// password_resets/edit.html.erb
export function PasswordResetEdit() {
  const { token } = useParams();
  const { flashNext } = useFlash();
  const navigate = useNavigate();
  const { run, errorMessages, pending } = useAction();
  const [emailAddress, setEmailAddress] = useState(null);
  const [form, setForm] = useState({ password: "", password_confirmation: "" });
  const path = `/password_resets/${encodeURIComponent(token)}`;

  useEffect(() => {
    let cancelled = false;
    api(path)
      .then((data) => {
        if (!cancelled) setEmailAddress(data.email_address);
      })
      .catch((error) => {
        if (cancelled) return;
        if (isInvalidLink(error)) {
          flashNext({ alert: error.body.alert });
          navigate("/password_resets/new", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path, flashNext, navigate]);

  async function submit(event) {
    event.preventDefault();
    let invalidLink = null;
    const data = await run(() =>
      api(path, { method: "PATCH", body: { user: form } }).catch((error) => {
        if (!isInvalidLink(error)) throw error;
        invalidLink = error;
      })
    );

    if (invalidLink) {
      flashNext({ alert: invalidLink.body.alert });
      navigate("/password_resets/new");
    } else if (data) {
      flashNext({ notice: data.notice });
      navigate("/login");
    }
  }

  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  if (emailAddress === null) return null;

  return (
    <div className="mx-auto max-w-sm">
      <div className="ka-card p-8">
        <Brand />

        <h1 className="mt-6 font-display text-lg text-white">Neues Passwort setzen</h1>
        <p className="mt-2 text-sm text-slate-400">Für {emailAddress}</p>

        <div className="mt-6">
          <ErrorList messages={errorMessages} />

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="user_password" className="ka-label normal-case tracking-normal">Neues Passwort</label>
              <input id="user_password" type="password" value={form.password} onChange={change("password")} required autoFocus
                placeholder="mindestens 8 Zeichen" className="ka-input" />
            </div>

            <div>
              <label htmlFor="user_password_confirmation" className="ka-label normal-case tracking-normal">Passwort wiederholen</label>
              <input id="user_password_confirmation" type="password" value={form.password_confirmation}
                onChange={change("password_confirmation")} required placeholder="••••••••" className="ka-input" />
            </div>

            <button type="submit" disabled={pending} className="ka-btn-primary w-full py-3">Passwort speichern</button>
          </form>
        </div>
      </div>
    </div>
  );
}
