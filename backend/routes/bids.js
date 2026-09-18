const express = require("express");
const db = require("../db");
const { authWajib } = require("../middleware/auth");

const router = express.Router();

// POST /api/bids - pasang tawaran pada sebuah aset
router.post("/", authWajib, (req, res) => {
  const { asset_id, jumlah } = req.body;
  if (!asset_id || !jumlah) {
    return res.status(400).json({ error: "asset_id dan jumlah wajib diisi." });
  }

  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(asset_id);
  if (!asset) return res.status(404).json({ error: "Aset tidak ditemukan." });

  const now = new Date();
  if (asset.status !== "berjalan" && asset.status !== "draft") {
    return res.status(400).json({ error: "Lelang untuk aset ini tidak berstatus berjalan." });
  }
  if (now < new Date(asset.mulai_at)) {
    return res.status(400).json({ error: "Lelang belum dimulai." });
  }
  if (now > new Date(asset.selesai_at)) {
    return res.status(400).json({ error: "Lelang untuk aset ini sudah berakhir." });
  }

  const tertinggi = db
    .prepare("SELECT MAX(jumlah) AS maks FROM bids WHERE asset_id = ?")
    .get(asset_id);
  const bidSaatIni = tertinggi.maks || asset.harga_awal;
  const bidMinimal = bidSaatIni + asset.kelipatan_bid;

  if (jumlah < bidMinimal) {
    return res.status(400).json({
      error: `Tawaran terlalu rendah. Minimal Rp${bidMinimal.toLocaleString("id-ID")}.`,
      bid_minimal: bidMinimal,
    });
  }

  const info = db
    .prepare("INSERT INTO bids (asset_id, user_id, jumlah) VALUES (?, ?, ?)")
    .run(asset_id, req.user.id, Math.round(jumlah));

  const bidBaru = db
    .prepare(
      `SELECT bids.id, bids.jumlah, bids.created_at, users.nama AS nama_penawar
       FROM bids JOIN users ON users.id = bids.user_id WHERE bids.id = ?`
    )
    .get(info.lastInsertRowid);

  res.status(201).json({ data: bidBaru });
});

// GET /api/bids/saya - riwayat tawaran milik user yang login
router.get("/saya", authWajib, (req, res) => {
  const rows = db
    .prepare(
      `SELECT bids.id, bids.jumlah, bids.created_at, assets.id AS asset_id, assets.nama_aset, assets.status, assets.selesai_at
       FROM bids JOIN assets ON assets.id = bids.asset_id
       WHERE bids.user_id = ? ORDER BY bids.created_at DESC`
    )
    .all(req.user.id);
  res.json({ data: rows });
});

module.exports = router;
