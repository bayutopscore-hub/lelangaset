require("dotenv").config();

if (process.env.NODE_ENV === "production") {
  const jwtSecret = process.env.JWT_SECRET || "";
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim())
    .filter(Boolean);
  const corsOrigin = process.env.CORS_ORIGIN || "";
  const konfigurasiKurang = [];

  if (jwtSecret.length < 32 || jwtSecret.startsWith("REPLACE_")) konfigurasiKurang.push("JWT_SECRET acak minimal 32 karakter");
  if (!adminEmail || adminPassword.length < 16 || adminPassword.startsWith("CHANGE_ME")) {
    konfigurasiKurang.push("ADMIN_EMAIL dan ADMIN_PASSWORD unik minimal 16 karakter");
  }
  if (allowedDomains.length === 0) konfigurasiKurang.push("ALLOWED_EMAIL_DOMAINS");
  if (!/^https:\/\/[^/]+$/.test(corsOrigin) || /localhost|127\.0\.0\.1/i.test(corsOrigin)) {
    konfigurasiKurang.push("CORS_ORIGIN production menggunakan HTTPS");
  }

  if (konfigurasiKurang.length > 0) {
    throw new Error(`Konfigurasi production belum aman: ${konfigurasiKurang.join(", ")}.`);
  }
}

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const assetRoutes = require("./routes/assets");
const bidRoutes = require("./routes/bids");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, waktu: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/admin", adminRoutes);

// Penanganan error umum
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan pada server." });
});

require("./data/seed")();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server lelang internal berjalan di http://localhost:${PORT}`);
});
