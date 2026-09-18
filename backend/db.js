const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "lelang.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---- Skema database ----
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  departemen TEXT,
  role TEXT NOT NULL DEFAULT 'karyawan', -- 'karyawan' | 'admin'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_aset TEXT NOT NULL,
  deskripsi TEXT,
  kategori TEXT,
  cabang_asal TEXT,
  kondisi TEXT, -- 'baik' | 'perlu_perbaikan' | 'rusak_ringan'
  foto_url TEXT,
  harga_awal INTEGER NOT NULL,
  kelipatan_bid INTEGER NOT NULL DEFAULT 50000,
  mulai_at TEXT NOT NULL,
  selesai_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'berjalan' | 'selesai' | 'dibatalkan'
  dibuat_oleh INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (dibuat_oleh) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  jumlah INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bids_asset ON bids(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
`);

module.exports = db;
