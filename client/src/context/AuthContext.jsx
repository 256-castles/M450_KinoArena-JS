import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

// current_user / logged_in? / admin? aus dem ApplicationController
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api("/session");
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    api("/session")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({ user, loading, loggedIn: Boolean(user), admin: Boolean(user?.admin), setUser, refresh }),
    [user, loading, refresh]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
