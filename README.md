# Lelang Aset Internal Karyawan

Aplikasi web untuk melelang aset dari cabang non-aktif kepada karyawan internal secara online. Terdiri dari backend (Express + SQLite) dan frontend (React + Vite).

## Fitur

- **Login & registrasi karyawan** dengan autentikasi JWT.
- **Daftar aset lelang** dengan filter status (akan datang / berjalan / selesai), foto, dan hitung mundur waktu.
- **Detail aset & pasang tawaran** — sistem menolak tawaran di bawah kelipatan minimum, dan menampilkan riwayat penawaran secara real-time (auto refresh via polling countdown).
- **Riwayat tawaran saya** untuk tiap karyawan.
- **Panel admin**: tambah/ubah/batalkan aset, lihat statistik, dan lihat daftar pemenang tiap lelang yang sudah selesai.
- Akses aset dan tawaran dibatasi hanya untuk user yang sudah login (internal only) — tidak ada halaman publik.

## Struktur Folder

```
lelang-internal/
├── backend/     -> API Express + database SQLite (file lelang.db dibuat otomatis)
└── frontend/    -> Aplikasi React (Vite)
```

## Menjalankan Backend

```bash
cd backend
npm install
cp .env.example .env      # sesuaikan JWT_SECRET dan kredensial admin default
npm run seed               # membuat akun admin default + 3 contoh aset
npm run dev                 # jalan di http://localhost:4000
```

Kredensial admin default (bisa diubah di `.env` sebelum `npm run seed`):
- Email: `admin@perusahaan.com`
- Password: `admin123`

**Penting:** ganti `JWT_SECRET` di `.env` dengan string acak yang panjang sebelum digunakan di lingkungan produksi, dan ganti password admin default setelah login pertama kali.

## Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev                 # jalan di http://localhost:5173
```

Frontend otomatis mem-proxy request `/api/*` ke `http://localhost:4000` (lihat `vite.config.js`), jadi pastikan backend sudah berjalan lebih dulu.

## Alur Pemakaian

1. Admin login dengan akun admin, lalu masuk ke **Panel Admin** → **Tambah Aset** untuk mengisi data aset (nama, cabang asal, kondisi, harga awal, kelipatan tawaran, waktu mulai/selesai).
2. Karyawan mendaftar akun sendiri (self-service registration) menggunakan email kantor, lalu login.
3. Karyawan melihat daftar aset yang berstatus "berjalan", membuka detail, dan memasang tawaran — sistem otomatis memvalidasi tawaran minimum berikutnya.
4. Setelah waktu lelang berakhir, status aset otomatis menjadi "selesai" dan admin bisa melihat pemenangnya di tab **Pemenang Lelang** pada Panel Admin (penawar dengan jumlah tertinggi).

## Catatan Keamanan & Pengembangan Lanjutan

- Registrasi saat ini terbuka untuk siapa saja yang tahu URL — untuk penggunaan internal sebaiknya batasi domain email yang diterima (misalnya hanya `@perusahaannamu.com`) dengan menambahkan validasi di `backend/routes/auth.js`, atau integrasikan dengan SSO/Active Directory perusahaan.
- Database menggunakan SQLite (file `lelang.db`) — cukup untuk skala internal; jika trafik besar, bisa dimigrasikan ke PostgreSQL/MySQL dengan struktur tabel yang sama.
- Belum ada notifikasi email/real-time (WebSocket) ketika ada tawaran baru — saat ini karyawan perlu membuka ulang halaman aset untuk melihat tawaran terbaru (data selalu diambil ulang saat halaman detail dibuka dan setiap submit tawaran).
- Untuk produksi, jalankan backend di belakang HTTPS (reverse proxy seperti Nginx) dan atur `CORS_ORIGIN` ke domain internal yang sebenarnya.
