const express = require("express");
const db = require("../db");
const { authWajib, hanyaAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(authWajib, hanyaAdmin);

function csvValue(value) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function kirimCsv(res, namaFile, kolom, baris) {
  const isi = [kolom, ...baris].map((row) => row.map(csvValue).join(",")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${namaFile}"`);
  res.send(`\uFEFF${isi}`);
}

// GET /api/admin/users - daftar seluruh karyawan terdaftar
router.get("/users", (req, res) => {
  const rows = db.prepare("SELECT id, nama, email, departemen, role, created_at FROM users ORDER BY created_at DESC").all();
  res.json({ data: rows });
});

// GET /api/admin/export/users.csv - ekspor data pengguna
router.get("/export/users.csv", (req, res) => {
  const rows = db.prepare("SELECT id, nama, email, departemen, role, created_at FROM users ORDER BY created_at DESC").all();
  kirimCsv(res, "pengguna.csv", ["id", "nama", "email", "departemen", "role", "terdaftar_pada"], rows.map((row) => [
    row.id, row.nama, row.email, row.departemen, row.role, row.created_at,
  ]));
});

// GET /api/admin/export/bids.csv - seluruh aktivitas bid, termasuk penanda pemenang
router.get("/export/bids.csv", (req, res) => {
  const now = new Date().toISOString();
  const rows = db.prepare(
    `SELECT bids.id AS bid_id, users.id AS user_id, users.nama, users.email, users.departemen,
            assets.id AS asset_id, assets.nama_aset, bids.jumlah, bids.created_at,
            CASE WHEN assets.selesai_at < ? AND assets.status NOT IN ('draft', 'dibatalkan')
              AND bids.id = (
                SELECT kandidat.id FROM bids AS kandidat
                WHERE kandidat.asset_id = assets.id
                ORDER BY kandidat.jumlah DESC, kandidat.created_at ASC LIMIT 1
              ) THEN 'Ya' ELSE 'Tidak' END AS pemenang
     FROM bids
     JOIN users ON users.id = bids.user_id
     JOIN assets ON assets.id = bids.asset_id
     ORDER BY bids.created_at DESC`
  ).all(now);
  kirimCsv(res, "aktivitas-bidding.csv", [
    "bid_id", "user_id", "nama", "email", "departemen", "asset_id", "nama_aset", "jumlah", "waktu_bid", "pemenang",
  ], rows.map((row) => [
    row.bid_id, row.user_id, row.nama, row.email, row.departemen, row.asset_id, row.nama_aset,
    row.jumlah, row.created_at, row.pemenang,
  ]));
});

// GET /api/admin/export/pemenang.csv - rekap hasil lelang yang telah selesai
router.get("/export/pemenang.csv", (req, res) => {
  const now = new Date().toISOString();
  const rows = db.prepare(
    `SELECT assets.id AS asset_id, assets.nama_aset, assets.selesai_at,
            users.nama AS nama_pemenang, users.email AS email_pemenang,
            pemenang.jumlah AS harga_final
     FROM assets
     LEFT JOIN bids AS pemenang ON pemenang.id = (
       SELECT kandidat.id FROM bids AS kandidat
       WHERE kandidat.asset_id = assets.id
       ORDER BY kandidat.jumlah DESC, kandidat.created_at ASC LIMIT 1
     )
     LEFT JOIN users ON users.id = pemenang.user_id
     WHERE assets.selesai_at < ? AND assets.status NOT IN ('draft', 'dibatalkan')
     ORDER BY assets.selesai_at DESC`
  ).all(now);
  kirimCsv(res, "pemenang-lelang.csv", [
    "asset_id", "nama_aset", "selesai_pada", "nama_pemenang", "email_pemenang", "harga_final",
  ], rows.map((row) => [
    row.asset_id, row.nama_aset, row.selesai_at, row.nama_pemenang, row.email_pemenang, row.harga_final,
  ]));
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
