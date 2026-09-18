import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [modeDaftar, setModeDaftar] = useState(false);
  const [form, setForm] = useState({ nama: "", email: "", password: "", departemen: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  function ubah(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (modeDaftar) {
        await register(form);
      } else {
        await login(form.email, form.password);
      }
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={submit}>
        <h1>{modeDaftar ? "Daftar Akun Karyawan" : "Masuk ke Lelang Internal"}</h1>
        <p className="auth-subtitle">Khusus untuk karyawan internal perusahaan.</p>

        {modeDaftar && (
          <>
            <label>Nama Lengkap</label>
            <input name="nama" value={form.nama} onChange={ubah} required />
            <label>Departemen</label>
            <input name="departemen" value={form.departemen} onChange={ubah} placeholder="Opsional" />
          </>
        )}

        <label>Email Kantor</label>
        <input type="email" name="email" value={form.email} onChange={ubah} required />

        <label>Password</label>
        <input type="password" name="password" value={form.password} onChange={ubah} required minLength={6} />

        {error && <div className="alert-error">{error}</div>}

        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Memproses..." : modeDaftar ? "Daftar" : "Masuk"}
        </button>

        <button type="button" className="btn btn-link" onClick={() => setModeDaftar(!modeDaftar)}>
          {modeDaftar ? "Sudah punya akun? Masuk di sini" : "Belum punya akun? Daftar di sini"}
        </button>
      </form>
    </div>
  );
}
