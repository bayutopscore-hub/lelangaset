const express = require("express");
const db = require("../db");
const { authWajib, hanyaAdmin } = require("../middleware/auth");

const router = express.Router();

// Hitung status efektif aset berdasarkan waktu saat ini (tidak mengubah status 'dibatalkan')
function statusEfektif(asset) {
  if (asset.status === "dibatalkan" || asset.status === "draft") return asset.status;
  const now = new Date();
  const mulai = new Date(asset.mulai_at);
  const selesai = new Date(asset.selesai_at);
  if (now < mulai) return "akan_datang";
  if (now >= mulai && now <= selesai) return "berjalan";
  return "selesai";
}

function lampirkanInfoBid(asset) {
  const tertinggi = db
    .prepare(
      `SELECT bids.jumlah, bids.created_at, users.nama AS nama_penawar
       FROM bids JOIN users ON users.id = bids.user_id
       WHERE bids.asset_id = ? ORDER BY bids.jumlah DESC, bids.created_at ASC LIMIT 1`
    )
    .get(asset.id);
  const jumlahBid = db.prepare("SELECT COUNT(*) AS c FROM bids WHERE asset_id = ?").get(asset.id).c;

  return {
    ...asset,
    status_efektif: statusEfektif(asset),
    harga_tertinggi: tertinggi ? tertinggi.jumlah : asset.harga_awal,
    penawar_tertinggi: tertinggi ? tertinggi.nama_penawar : null,
    jumlah_bid: jumlahBid,
    bid_minimal_berikutnya: (tertinggi ? tertinggi.jumlah : asset.harga_awal) + asset.kelipatan_bid,
  };
}

// GET /api/assets - daftar semua aset (karyawan hanya lihat yang bukan draft)
router.get("/", authWajib, (req, res) => {
  const { status, kategori, cabang } = req.query;
  let rows;
  if (req.user.role === "admin") {
    rows = db.prepare("SELECT * FROM assets ORDER BY created_at DESC").all();
  } else {
    rows = db.prepare("SELECT * FROM assets WHERE status != 'draft' ORDER BY created_at DESC").all();
  }

  let hasil = rows.map(lampirkanInfoBid);

  if (status) hasil = hasil.filter((a) => a.status_efektif === status);
  if (kategori) hasil = hasil.filter((a) => a.kategori === kategori);
  if (cabang) hasil = hasil.filter((a) => a.cabang_asal === cabang);

  res.json({ data: hasil });
});

// GET /api/assets/:id - detail aset + riwayat bid
router.get("/:id", authWajib, (req, res) => {
  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(req.params.id);
  if (!asset) return res.status(404).json({ error: "Aset tidak ditemukan." });
  if (asset.status === "draft" && req.user.role !== "admin") {
    return res.status(404).json({ error: "Aset tidak ditemukan." });
  }

  const riwayatBid = db
    .prepare(
      `SELECT bids.id, bids.jumlah, bids.created_at, users.nama AS nama_penawar
       FROM bids JOIN users ON users.id = bids.user_id
       WHERE bids.asset_id = ? ORDER BY bids.jumlah DESC, bids.created_at ASC`
    )
    .all(asset.id);

  res.json({ data: { ...lampirkanInfoBid(asset), riwayat_bid: riwayatBid } });
});

// POST /api/assets - buat aset baru (admin)
router.post("/", authWajib, hanyaAdmin, (req, res) => {
  const {
    nama_aset,
    deskripsi,
    kategori,
    cabang_asal,
    kondisi,
    foto_url,
    harga_awal,
    kelipatan_bid,
    mulai_at,
    selesai_at,
    status,
  } = req.body;

  if (!nama_aset || !harga_awal || !mulai_at || !selesai_at) {
    return res.status(400).json({ error: "nama_aset, harga_awal, mulai_at, dan selesai_at wajib diisi." });
  }
  if (new Date(selesai_at) <= new Date(mulai_at)) {
    return res.status(400).json({ error: "Waktu selesai harus setelah waktu mulai." });
  }

  const info = db
    .prepare(
      `INSERT INTO assets (nama_aset, deskripsi, kategori, cabang_asal, kondisi, foto_url, harga_awal, kelipatan_bid, mulai_at, selesai_at, status, dibuat_oleh)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      nama_aset,
      deskripsi || null,
      kategori || null,
      cabang_asal || null,
      kondisi || "baik",
      foto_url || null,
      Math.round(harga_awal),
      Math.round(kelipatan_bid) || 50000,
      mulai_at,
      selesai_at,
      status || "berjalan",
      req.user.id
    );

  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ data: lampirkanInfoBid(asset) });
});

// PUT /api/assets/:id - update aset (admin)
router.put("/:id", authWajib, hanyaAdmin, (req, res) => {
  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(req.params.id);
  if (!asset) return res.status(404).json({ error: "Aset tidak ditemukan." });

  const kolomBolehUbah = [
    "nama_aset", "deskripsi", "kategori", "cabang_asal", "kondisi",
    "foto_url", "harga_awal", "kelipatan_bid", "mulai_at", "selesai_at", "status",
  ];
  const data = { ...asset };
  for (const kolom of kolomBolehUbah) {
    if (req.body[kolom] !== undefined) data[kolom] = req.body[kolom];
  }

  db.prepare(
    `UPDATE assets SET nama_aset=?, deskripsi=?, kategori=?, cabang_asal=?, kondisi=?, foto_url=?, harga_awal=?, kelipatan_bid=?, mulai_at=?, selesai_at=?, status=? WHERE id=?`
  ).run(
    data.nama_aset, data.deskripsi, data.kategori, data.cabang_asal, data.kondisi,
    data.foto_url, data.harga_awal, data.kelipatan_bid, data.mulai_at, data.selesai_at, data.status,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM assets WHERE id = ?").get(req.params.id);
  res.json({ data: lampirkanInfoBid(updated) });
});

// DELETE /api/assets/:id - batalkan aset (admin), tidak menghapus data secara permanen
router.delete("/:id", authWajib, hanyaAdmin, (req, res) => {
  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(req.params.id);
  if (!asset) return res.status(404).json({ error: "Aset tidak ditemukan." });
  db.prepare("UPDATE assets SET status = 'dibatalkan' WHERE id = ?").run(req.params.id);
  res.json({ message: "Aset dibatalkan." });
});

module.exports = router;
