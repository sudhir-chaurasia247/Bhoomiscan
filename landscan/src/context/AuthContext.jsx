import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const USER_KEY = "bhoomiscan_user";
const TOKEN_KEY = "token";
export const ROLE_LABELS = {
  operator: "Operator",
  verifier: "Verifier",
  admin: "Administrator",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);

      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch (err) {
      console.error(err);
    }

    setReady(true);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,

      login: async (email, password, role) => {
        console.log("LOGIN REQUEST", {
  email,
  password,
  role,
});

const res = await api.post("/auth/login", {
  email,
  password,
  role,
});

        const data = res.data.data;

        const nextUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          district: data.user.district,
        };

        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        localStorage.setItem(TOKEN_KEY, data.accessToken);

        setUser(nextUser);

        return nextUser;
      },

      logout: () => {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      },
    }),
    [user, ready]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}
export default AuthProvider;