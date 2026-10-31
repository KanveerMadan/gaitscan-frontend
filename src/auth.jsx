import { useEffect, useState } from "react";
import axios from "axios";
import { AuthContext } from "@/auth-context";

// Set synchronously (not in an effect) so child components' first requests carry the token.
function setAuthHeader(user) {
  if (user?.token) axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
  else delete axios.defaults.headers.common["Authorization"];
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Earlier versions saved the plaintext password here; remove it from every browser.
    localStorage.removeItem("gaitscan_creds");
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem("gaitscan_user"));
    } catch {
      stored = null;
    }
    setAuthHeader(stored);
    return stored;
  });

  // An expired session goes to the sign-in screen; signing out on purpose goes to the landing page.
  const [expired, setExpired] = useState(false);

  const login = (userData) => {
    localStorage.setItem("gaitscan_user", JSON.stringify(userData));
    setAuthHeader(userData);
    setExpired(false);
    setUser(userData);
  };

  const logout = (sessionExpired = false) => {
    localStorage.removeItem("gaitscan_user");
    setAuthHeader(null);
    setExpired(sessionExpired === true);
    setUser(null);
  };

  // The theme setting (light / dark / follow the system) on <html>, as src/index.css expects.
  const theme = user?.settings?.theme ?? "system";
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme !== "system") root.classList.add(theme);
  }, [theme]);

  // Tokens expire (12 h); any 401 returns the user to the sign-in screen.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) logout(true);
        return Promise.reject(err);
      },
    );
    return () => axios.interceptors.response.eject?.(id);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout, expired }}>{children}</AuthContext.Provider>;
}
