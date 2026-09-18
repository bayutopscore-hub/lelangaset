require("dotenv").config();
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server lelang internal berjalan di http://localhost:${PORT}`);
});
