const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authWajib } = require("../middleware/auth");

const router = express.Router();

function buatToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, nama: user.nama },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

// Registrasi akun karyawan baru (role selalu 'karyawan', admin dibuat lewat seed)
router.post("/register", (req, res) => {
  const { nama, email, password, departemen } = req.body;
  if (typeof nama !== "string" || typeof email !== "string" || typeof password !== "string" || !nama.trim() || !email.trim() || !password) {
    return res.status(400).json({ error: "Nama, email, dan password wajib diisi." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password minimal 6 karakter." });
  }

  const emailNormal = email.toLowerCase().trim();
  const cocokEmail = emailNormal.match(/^[^@\s]+@([^@\s]+)$/);
  if (!cocokEmail) {
    return res.status(400).json({ error: "Format email tidak valid." });
  }

  const domainDiizinkan = (process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  if (domainDiizinkan.length === 0) {
    return res.status(503).json({ error: "Registrasi belum dikonfigurasi oleh administrator." });
  }
  if (!domainDiizinkan.includes(cocokEmail[1])) {
    return res.status(403).json({ error: "Gunakan alamat email dari domain perusahaan yang diizinkan." });
  }

  const sudahAda = db.prepare("SELECT id FROM users WHERE email = ?").get(emailNormal);
  if (sudahAda) {
    return res.status(409).json({ error: "Email sudah terdaftar." });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (nama, email, password_hash, departemen, role) VALUES (?, ?, ?, ?, 'karyawan')")
    .run(nama.trim(), emailNormal, hash, departemen || null);

  const user = db.prepare("SELECT id, nama, email, departemen, role FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = buatToken(user);
  res.status(201).json({ user, token });
});

// Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password wajib diisi." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Email atau password salah." });
  }

  const token = buatToken(user);
  const { password_hash, ...userAman } = user;
  res.json({ user: userAman, token });
});

// Info user yang sedang login
router.get("/me", authWajib, (req, res) => {
  const user = db.prepare("SELECT id, nama, email, departemen, role FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User tidak ditemukan." });
  res.json({ user });
});

module.exports = router;
