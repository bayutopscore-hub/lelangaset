const express = require("express");
const ExcelJS = require("exceljs");
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

const kolomAset = [
  "id", "nama_aset", "deskripsi", "kategori", "cabang_asal", "kondisi", "foto_url",
  "harga_awal", "kelipatan_bid", "mulai_at", "selesai_at", "status",
];
const kolomAsetBisaUbah = kolomAset.filter((kolom) => kolom !== "id");

function nilaiSel(cell) {
  const value = cell.value;
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("").trim();
    if (value.result !== undefined) return value.result;
    return "";
  }
  return typeof value === "string" ? value.trim() : value;
}

function teks(value) {
  return value == null ? "" : String(value).trim();
}

function tanggal(value, label, nomorBaris) {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`Baris ${nomorBaris}: ${label} tidak valid.`);
  }
  return date.toISOString();
}

function angka(value, label, nomorBaris, { wajib = false, defaultValue = null } = {}) {
  if (value === "" || value == null) {
    if (wajib) throw new Error(`Baris ${nomorBaris}: ${label} wajib diisi.`);
    return defaultValue;
  }
  const text = String(value).trim();
  if (typeof value !== "number" && /[.,]\d{1,2}$/.test(text)) {
    throw new Error(`Baris ${nomorBaris}: ${label} tidak boleh memiliki angka desimal.`);
  }
  const parsed = typeof value === "number" ? value : Number(text.replace(/[^\d-]/g, ""));
  if (!Number.isSafeInteger(parsed) || parsed < 0 || (wajib && parsed === 0)) {
    throw new Error(`Baris ${nomorBaris}: ${label} harus berupa bilangan bulat positif.`);
  }
  return parsed;
}

function buatWorkbookAset(assets) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Aset");
  worksheet.columns = kolomAset.map((key) => ({ header: key, key, width: key === "deskripsi" ? 40 : 22 }));
  for (const asset of assets) {
    worksheet.addRow(Object.fromEntries(kolomAset.map((key) => [key, asset[key] ?? ""])));
  }
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true };
  return workbook;
}

// GET /api/admin/export/assets.xlsx - ekspor aset sebagai Excel
router.get("/export/assets.xlsx", async (req, res, next) => {
  try {
    const assets = db.prepare("SELECT * FROM assets ORDER BY id").all();
    const workbook = buatWorkbookAset(assets);
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="aset-lelang.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/import/assets.xlsx - impor aset secara atomik tanpa menghapus data lama
router.post("/import/assets.xlsx", express.raw({ type: "application/octet-stream", limit: "10mb" }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: "Pilih file Excel .xlsx yang akan diimpor." });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.body);
    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(400).json({ error: "File Excel harus memiliki header dan minimal satu baris aset." });
    }
    if (worksheet.rowCount > 5001) {
      return res.status(400).json({ error: "Maksimal 5.000 baris aset per impor." });
    }

    const header = new Map();
    worksheet.getRow(1).eachCell((cell, columnNumber) => {
      const key = teks(nilaiSel(cell)).toLowerCase();
      if (key) header.set(key, columnNumber);
    });
    for (const required of ["nama_aset", "harga_awal", "mulai_at", "selesai_at"]) {
      if (!header.has(required)) {
        return res.status(400).json({ error: `Kolom wajib '${required}' tidak ditemukan pada baris header.` });
      }
    }

    const seenIds = new Set();
    const rows = [];
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const values = Object.fromEntries([...header].map(([key, column]) => [key, nilaiSel(row.getCell(column))]));
      if (Object.values(values).every((value) => value === "" || value == null)) continue;

      let id = null;
      if (values.id !== undefined && values.id !== "") {
        id = angka(values.id, "id", rowNumber, { wajib: true });
        if (id === 0 || seenIds.has(id)) throw new Error(`Baris ${rowNumber}: id aset tidak valid atau duplikat.`);
        seenIds.add(id);
      }
      const existing = id ? db.prepare("SELECT id FROM assets WHERE id = ?").get(id) : null;
      if (id && !existing) throw new Error(`Baris ${rowNumber}: aset dengan id ${id} tidak ditemukan. ID hanya untuk memperbarui hasil ekspor.`);

      const data = {};
      for (const key of kolomAsetBisaUbah) {
        if (!header.has(key)) continue;
        const value = values[key] ?? "";
        if (key === "nama_aset") {
          data[key] = teks(value);
          if (!data[key]) throw new Error(`Baris ${rowNumber}: nama_aset wajib diisi.`);
        } else if (key === "harga_awal") {
          data[key] = angka(value, key, rowNumber, { wajib: true });
        } else if (key === "kelipatan_bid") {
          data[key] = angka(value, key, rowNumber, { defaultValue: 50000 }) || 50000;
        } else if (key === "mulai_at" || key === "selesai_at") {
          data[key] = tanggal(value, key, rowNumber);
        } else if (key === "status") {
          data[key] = teks(value) || (existing ? undefined : "draft");
          if (data[key] && !["draft", "berjalan", "selesai", "dibatalkan"].includes(data[key])) {
            throw new Error(`Baris ${rowNumber}: status harus draft, berjalan, selesai, atau dibatalkan.`);
          }
        } else if (key === "kondisi") {
          data[key] = teks(value) || (existing ? undefined : "baik");
          if (data[key] && !["baik", "perlu_perbaikan", "rusak_ringan"].includes(data[key])) {
            throw new Error(`Baris ${rowNumber}: kondisi harus baik, perlu_perbaikan, atau rusak_ringan.`);
          }
        } else {
          data[key] = teks(value) || null;
        }
      }

      if (new Date(data.selesai_at) <= new Date(data.mulai_at)) {
        throw new Error(`Baris ${rowNumber}: selesai_at harus setelah mulai_at.`);
      }
      rows.push({ id, data });
    }

    if (rows.length === 0) return res.status(400).json({ error: "Tidak ada baris aset untuk diimpor." });

    const updateColumns = [...header.keys()].filter((key) => kolomAsetBisaUbah.includes(key));
    const insert = db.prepare(
      `INSERT INTO assets (${kolomAsetBisaUbah.join(", ")}, dibuat_oleh)
       VALUES (${kolomAsetBisaUbah.map(() => "?").join(", ")}, ?)`
    );
    const update = db.prepare(
      `UPDATE assets SET ${updateColumns.map((key) => `${key} = ?`).join(", ")} WHERE id = ?`
    );
    let ditambahkan = 0;
    let diperbarui = 0;
    const simpan = db.transaction(() => {
      for (const { id, data } of rows) {
        if (id) {
          const existing = db.prepare("SELECT * FROM assets WHERE id = ?").get(id);
          const values = updateColumns.map((key) => data[key] === undefined ? existing[key] : data[key]);
          update.run(...values, id);
          diperbarui += 1;
        } else {
          const defaults = { kondisi: "baik", kelipatan_bid: 50000, status: "draft" };
          insert.run(...kolomAsetBisaUbah.map((key) => data[key] ?? defaults[key] ?? null), req.user.id);
          ditambahkan += 1;
        }
      }
    });
    simpan();
    res.json({ data: { ditambahkan, diperbarui } });
  } catch (error) {
    res.status(400).json({ error: `Impor dibatalkan: ${error.message}` });
  }
});

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
