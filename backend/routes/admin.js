const express = require("express");
const db = require("../db");
const { authWajib, hanyaAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(authWajib, hanyaAdmin);

// GET /api/admin/users - daftar seluruh karyawan terdaftar
router.get("/users", (req, res) => {
  const rows = db.prepare("SELECT id, nama, email, departemen, role, created_at FROM users ORDER BY created_at DESC").all();
  res.json({ data: rows });
});

// GET /api/admin/stats - ringkasan untuk dashboard admin
router.get("/stats", (req, res) => {
  const totalAset = db.prepare("SELECT COUNT(*) AS c FROM assets").get().c;
  const asetBerjalan = db.prepare("SELECT COUNT(*) AS c FROM assets WHERE status = 'berjalan'").get().c;
  const totalKaryawan = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'karyawan'").get().c;
  const totalBid = db.prepare("SELECT COUNT(*) AS c FROM bids").get().c;
  res.json({ data: { totalAset, asetBerjalan, totalKaryawan, totalBid } });
});

// GET /api/admin/pemenang - daftar aset yang lelangnya sudah selesai beserta pemenangnya
router.get("/pemenang", (req, res) => {
  const now = new Date().toISOString();
  const assets = db
    .prepare("SELECT * FROM assets WHERE selesai_at < ? AND status != 'draft' AND status != 'dibatalkan'")
    .all(now);

  const hasil = assets.map((asset) => {
    const pemenang = db
      .prepare(
        `SELECT bids.jumlah, users.nama, users.email
         FROM bids JOIN users ON users.id = bids.user_id
         WHERE bids.asset_id = ? ORDER BY bids.jumlah DESC, bids.created_at ASC LIMIT 1`
      )
      .get(asset.id);
    return { asset, pemenang: pemenang || null };
  });

  res.json({ data: hasil });
});

module.exports = router;
