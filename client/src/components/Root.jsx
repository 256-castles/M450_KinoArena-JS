import { Outlet } from "react-router";
import { AuthProvider } from "../context/AuthContext.jsx";
import { FlashProvider } from "../context/FlashContext.jsx";

// Stellt Anmeldung und Flash-Meldungen fuer alle Seiten bereit
export function Root() {
  return (
    <AuthProvider>
      <FlashProvider>
        <Outlet />
      </FlashProvider>
    </AuthProvider>
  );
}
