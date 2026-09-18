require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../db");

function seed() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@perusahaan.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
  if (!existingAdmin) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(
      `INSERT INTO users (nama, email, password_hash, departemen, role) VALUES (?, ?, ?, ?, ?)`
    ).run("Administrator", adminEmail, hash, "HO - General Affairs", "admin");
    console.log(`Admin dibuat: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log("Admin sudah ada, dilewati.");
  }

  const contoh = db.prepare("SELECT COUNT(*) AS c FROM assets").get();
  if (contoh.c === 0) {
    const admin = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
    const now = new Date();
    const mulai = new Date(now.getTime() - 1000 * 60 * 60).toISOString();
    const selesai = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3).toISOString();

    const insert = db.prepare(`
      INSERT INTO assets (nama_aset, deskripsi, kategori, cabang_asal, kondisi, foto_url, harga_awal, kelipatan_bid, mulai_at, selesai_at, status, dibuat_oleh)
      VALUES (@nama_aset, @deskripsi, @kategori, @cabang_asal, @kondisi, @foto_url, @harga_awal, @kelipatan_bid, @mulai_at, @selesai_at, @status, @dibuat_oleh)
    `);

    const contohAset = [
      {
        nama_aset: "Meja Kerja Kantor (Set 10 unit)",
        deskripsi: "Meja kerja kayu laminasi, kondisi baik, bekas cabang Bandung yang tutup.",
        kategori: "Furnitur",
        cabang_asal: "Cabang Bandung",
        kondisi: "baik",
        foto_url: "",
        harga_awal: 1500000,
        kelipatan_bid: 100000,
        mulai_at: mulai,
        selesai_at: selesai,
        status: "berjalan",
        dibuat_oleh: admin.id,
      },
      {
        nama_aset: "AC Split 1 PK (3 unit)",
        deskripsi: "AC split masih menyala normal, perlu servis ringan.",
        kategori: "Elektronik",
        cabang_asal: "Cabang Surabaya",
        kondisi: "perlu_perbaikan",
        foto_url: "",
        harga_awal: 800000,
        kelipatan_bid: 50000,
        mulai_at: mulai,
        selesai_at: selesai,
        status: "berjalan",
        dibuat_oleh: admin.id,
      },
      {
        nama_aset: "Mobil Operasional Avanza 2015",
        deskripsi: "Kondisi baik, service record lengkap, plat cabang non-aktif.",
        kategori: "Kendaraan",
        cabang_asal: "Cabang Medan",
        kondisi: "baik",
        foto_url: "",
        harga_awal: 85000000,
        kelipatan_bid: 500000,
        mulai_at: mulai,
        selesai_at: selesai,
        status: "berjalan",
        dibuat_oleh: admin.id,
      },
    ];

    for (const a of contohAset) insert.run(a);
    console.log("Contoh aset berhasil ditambahkan.");
  } else {
    console.log("Aset sudah ada, dilewati.");
  }
}

seed();
