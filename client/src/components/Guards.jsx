import { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { useFlash } from "../context/FlashContext.jsx";

// Erst die Meldung vormerken, dann umleiten (wie flash[:alert] + redirect_to)
function RedirectWithAlert({ to, alert }) {
  const { flashNext } = useFlash();
  const navigate = useNavigate();
  useEffect(() => {
    flashNext({ alert });
    navigate(to, { replace: true });
  }, [alert, to, flashNext, navigate]);
  return null;
}

// before_action :require_user
export function RequireUser() {
  const { loggedIn } = useAuth();
  if (!loggedIn) return <RedirectWithAlert to="/login" alert="Bitte melde dich zuerst an." />;
  return <Outlet />;
}

// before_action :require_admin
export function RequireAdmin() {
  const { loggedIn, admin } = useAuth();
  if (!loggedIn) return <RedirectWithAlert to="/login" alert="Bitte melde dich zuerst an." />;
  if (!admin) {
    return <RedirectWithAlert to="/" alert="Zugriff verweigert. Du hast keine Berechtigung für diese Seite." />;
  }
  return <Outlet />;
}

// Anmeldung, Registrierung und Passwort-Reset nur fuer nicht angemeldete Besucher
export function GuestOnly() {
  const { loggedIn } = useAuth();
  if (loggedIn) return <Navigate to="/" replace />;
  return <Outlet />;
}
