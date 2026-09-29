# Lelang Aset Internal Karyawan

![GitHub repo](https://img.shields.io/badge/GitHub-bayutopscore--hub%2Flelangaset-181717?logo=github)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-Local-003B57?logo=sqlite)
![Status](https://img.shields.io/badge/Status-Internal%20Demo-4CAF50)

Aplikasi lelang aset internal berbasis web. Frontend menggunakan React, Vite, dan React Router; backend menyediakan REST API dengan Express dan database SQLite.

## Fitur

- Registrasi karyawan dan login dengan JWT; kata sandi disimpan sebagai hash bcrypt.
- Daftar aset dengan filter status, harga tertinggi, jumlah tawaran, dan hitung mundur.
- Detail aset dengan deskripsi, kondisi, foto, jadwal lelang, serta riwayat tawaran.
- Validasi tawaran berdasarkan jadwal lelang dan kelipatan tawaran minimum.
- Riwayat tawaran milik pengguna yang sedang login.
- Panel admin untuk membuat, mengubah, dan membatalkan aset; melihat statistik dan hasil lelang.
- Pratinjau foto dari URL gambar atau link Google Drive. File Drive harus dapat diakses oleh siapa saja yang memiliki link.
- Unduh CSV data pengguna, seluruh aktivitas bidding, dan rekap pemenang.

## Struktur Proyek

```text
.
├── .gitignore
├── README.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js                 # Bootstrap Express, CORS, routes, dan seed
│   ├── db.js                     # Skema SQLite: users, assets, bids
│   ├── scripts/
│   │   └── backup.js             # Backup SQLite online
│   ├── data/
│   │   └── seed.js               # Admin awal dan contoh aset
│   ├── middleware/
│   │   └── auth.js               # Validasi JWT dan akses admin
│   └── routes/
│       ├── auth.js
│       ├── assets.js
│       ├── bids.js
│       └── admin.js
└── frontend/
	├── index.html
	├── package.json
	├── package-lock.json
	├── vite.config.js
	└── src/
		├── api.js
		├── App.jsx                # Definisi route halaman
		├── main.jsx               # Entry point React dan provider
		├── styles.css
		├── components/
		│   ├── CountdownTimer.jsx
		│   ├── GoogleDrivePreview.jsx
		│   ├── Navbar.jsx
		│   └── ProtectedRoute.jsx
		├── context/
		│   └── AuthContext.jsx
		└── pages/
			├── AdminAssetForm.jsx
			├── AdminDashboard.jsx
			├── AssetDetail.jsx
			├── AssetList.jsx
			├── Login.jsx
			└── MyBids.jsx
```

Database lokal `backend/lelang.db` dibuat otomatis dan tidak disimpan di Git. File `.env`, database, dependency, dan hasil build juga diabaikan oleh `.gitignore`.

## Prasyarat

- Node.js dan npm.
- Backend dan frontend dijalankan sebagai dua proses terpisah.

## Menjalankan Lokal



```bash
cd backend
npm install
cp .env.example .env
```

Atur nilai di `backend/.env`, terutama `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ALLOWED_EMAIL_DOMAINS`, dan `CORS_ORIGIN`. Ganti semua nilai contoh sebelum deployment. `ALLOWED_EMAIL_DOMAINS` menerima domain tanpa `@`, dipisahkan koma jika lebih dari satu; konfigurasi contoh memakai `topscore.co.id`, sehingga karyawan mendaftar dengan alamat seperti `nama@topscore.co.id`. Ini hanya membatasi teks domain email dan tidak memverifikasi kepemilikan alamat.

```bash
npm run dev
```

Backend berjalan di `http://localhost:4000`. Script server menjalankan seed saat startup; pada database kosong, seed membuat admin dan tiga contoh aset. `npm run seed` juga tersedia untuk menjalankan seed secara manual.

Nilai admin pada `.env.example` adalah placeholder dan harus diganti sebelum menjalankan server atau seed. Tidak ada fallback kredensial admin hard-coded. Kredensial hanya digunakan saat akun admin pertama kali dibuat; seed tidak mengganti password admin yang sudah ada. Untuk production, gunakan password unik minimal 16 karakter dan secret JWT acak minimal 32 karakter.

### 2. Frontend

Buka terminal lain dari root proyek:

```bash
cd frontend
npm install
npm run dev
```

Frontend tersedia di `http://localhost:5173`. Vite mem-proxy request `/api` ke `http://localhost:4000`. Untuk deployment dengan API di host lain, `VITE_API_URL` dapat diatur ke base URL backend; aplikasi menambahkan `/api` sendiri. Atur `CORS_ORIGIN` di backend agar sesuai dengan origin frontend.

Build produksi frontend dapat diperiksa dengan:

```bash
cd frontend
npm run build
```

Backend belum memiliki script test otomatis.

Backup SQLite online dapat dibuat saat backend tetap berjalan:

```bash
cd backend
npm run backup
```

File backup bertimestamp disimpan di `backend/backups/` secara default. Atur `BACKUP_DIR` ke storage terpisah untuk production, jadwalkan perintah backup (misalnya harian), tetapkan retensi, dan uji pemulihan berkala. Untuk pemulihan manual, hentikan backend, simpan salinan database saat ini, lalu pulihkan file backup sebagai `backend/lelang.db`.

## Halaman Aplikasi

| Route | Akses | Fungsi |
| --- | --- | --- |
| `/login` | Publik | Login dan registrasi karyawan |
| `/` | Login | Daftar aset dan filter status |
| `/aset/:id` | Login | Detail aset, riwayat tawaran, dan form bidding |
| `/bid-saya` | Login | Riwayat tawaran pengguna |
| `/admin` | Admin | Statistik, pengelolaan aset, pemenang, dan ekspor CSV |
| `/admin/aset/baru` | Admin | Membuat aset |
| `/admin/aset/:id/ubah` | Admin | Mengubah aset |

## Perilaku Lelang

- Status efektif `akan_datang`, `berjalan`, atau `selesai` dihitung dari jadwal aset saat data dibaca; status tersebut tidak ditulis otomatis kembali ke database. `draft` dan `dibatalkan` tetap menjadi status tersendiri.
- Karyawan tidak menerima aset berstatus `draft` pada daftar atau detail. Aset yang dibatalkan tidak dihapus; pembatalan mengubah status aset.
- Pemenang adalah penawar dengan jumlah tertinggi; jika jumlah sama, tawaran yang lebih awal menjadi pemenang. Hasil ditampilkan setelah waktu selesai.
- Countdown berjalan di browser. Tidak ada polling berkala atau push real-time untuk memperbarui tawaran; detail dimuat saat dibuka, setelah tawaran dikirim, dan saat countdown mencapai akhir.

## API

Semua endpoint aset, bidding, dan admin memerlukan bearer token JWT, kecuali login, registrasi, dan health check. Endpoint admin juga memerlukan role `admin`.

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/health` | Status server |
| `POST` | `/api/auth/register` | Registrasi akun karyawan |
| `POST` | `/api/auth/login` | Login dan penerbitan JWT |
| `GET` | `/api/auth/me` | Profil pengguna aktif |
| `GET` | `/api/assets?status=&kategori=&cabang=` | Daftar dan filter aset |
| `GET` | `/api/assets/:id` | Detail aset dan riwayat bid |
| `POST` | `/api/assets` | Membuat aset (admin) |
| `PUT` | `/api/assets/:id` | Mengubah aset (admin) |
| `DELETE` | `/api/assets/:id` | Membatalkan aset (admin) |
| `POST` | `/api/bids` | Memasang tawaran |
| `GET` | `/api/bids/saya` | Riwayat tawaran pengguna aktif |
| `GET` | `/api/admin/users` | Daftar pengguna (admin) |
| `GET` | `/api/admin/stats` | Ringkasan dashboard (admin) |
| `GET` | `/api/admin/pemenang` | Hasil lelang yang sudah selesai (admin) |
| `GET` | `/api/admin/export/users.csv` | Ekspor pengguna (admin) |
| `GET` | `/api/admin/export/bids.csv` | Ekspor aktivitas bid dan penanda pemenang (admin) |
| `GET` | `/api/admin/export/pemenang.csv` | Ekspor rekap pemenang (admin) |

Endpoint ekspor menghasilkan CSV UTF-8. Data pengguna yang diekspor tidak mencakup hash kata sandi.

## Keamanan dan Batasan

- Registrasi dibatasi oleh `ALLOWED_EMAIL_DOMAINS` dan selalu membuat role `karyawan`. Allowlist domain bukan verifikasi kepemilikan email; gunakan verifikasi email atau integrasi SSO perusahaan (OIDC/SAML) bila perlu memastikan identitas karyawan.
- JWT berlaku selama `JWT_EXPIRES_IN` (default `8h`). Production menolak secret JWT kurang dari 32 karakter, password admin kurang dari 16 karakter, allowlist kosong, atau `CORS_ORIGIN` yang bukan HTTPS. Batasi CORS ke origin frontend yang dipercaya.
- Seed tidak mencetak password ke log. Lindungi kredensial admin dan secret environment.
- SQLite disimpan lokal di `backend/lelang.db`; jalankan backup berkala ke storage terpisah dan uji restore. Untuk kebutuhan concurrent/write skala lebih besar, pertimbangkan database server.
- Aplikasi belum mengirim notifikasi email dan belum menggunakan WebSocket atau layanan real-time.
