import { useCallback } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useFlash } from "../context/FlashContext.jsx";

const UNEXPECTED = "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.";

// Zentrale Fehlerbehandlung wie require_user / user_not_authorized im Original:
//   401 -> zur Anmeldung, 403 -> zurueck zur vorherigen Seite, sonst Meldung anzeigen.
// 404 und Validierungsfehler (422 mit "errors") behandelt die jeweilige Seite selbst.
export function useApiErrorHandler() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { flashNow, flashNext } = useFlash();

  return useCallback(
    (error) => {
      if (!(error instanceof ApiError)) {
        flashNow({ alert: UNEXPECTED });
        return;
      }

      const { alert } = error.body;
      if (error.status === 401) {
        setUser(null);
        flashNext({ alert });
        navigate("/login");
      } else if (error.status === 403) {
        flashNext({ alert });
        if (error.body.redirect_to) navigate(error.body.redirect_to);
        else if (window.history.state?.idx > 0) navigate(-1);
        else navigate("/");
      } else if (error.status !== 404 && !error.body.errors) {
        flashNow({ alert: alert ?? UNEXPECTED });
      }
    },
    [navigate, setUser, flashNow, flashNext]
  );
}
