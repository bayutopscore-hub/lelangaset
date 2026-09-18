import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("lelang_token");
    if (!token) {
      setMemuat(false);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => localStorage.removeItem("lelang_token"))
      .finally(() => setMemuat(false));
  }, []);

  async function login(email, password) {
    const res = await api.login(email, password);
    localStorage.setItem("lelang_token", res.token);
    setUser(res.user);
    return res.user;
  }

  async function register(payload) {
    const res = await api.register(payload);
    localStorage.setItem("lelang_token", res.token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    localStorage.removeItem("lelang_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, memuat, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
