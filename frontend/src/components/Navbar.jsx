import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        🏷️ Lelang Aset Internal
      </Link>
      <nav className="navbar-links">
        {user && <Link to="/">Daftar Aset</Link>}
        {user && <Link to="/bid-saya">Tawaran Saya</Link>}
        {user?.role === "admin" && <Link to="/admin">Panel Admin</Link>}
        {user ? (
          <div className="navbar-user">
            <span>{user.nama}</span>
            <button onClick={handleLogout} className="btn btn-ghost">
              Keluar
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Masuk
          </Link>
        )}
      </nav>
    </header>
  );
}
