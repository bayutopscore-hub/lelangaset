import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

function formatRupiah(angka) {
  return `Rp${Number(angka).toLocaleString("id-ID")}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [assets, setAssets] = useState([]);
  const [pemenang, setPemenang] = useState([]);
  const [tab, setTab] = useState("aset");

  async function muat() {
    const [s, a, p] = await Promise.all([api.adminStats(), api.getAssets(), api.adminWinners()]);
    setStats(s.data);
    setAssets(a.data);
    setPemenang(p.data);
  }

  useEffect(() => {
    muat();
  }, []);

  async function batalkan(id) {
    if (!confirm("Batalkan lelang aset ini?")) return;
    await api.cancelAsset(id);
    muat();
  }

  return (
    <div className="container">
      <div className="page-header page-header-row">
        <div>
          <h1>Panel Admin</h1>
          <p>Kelola aset lelang internal dan pantau hasilnya.</p>
        </div>
        <Link to="/admin/aset/baru" className="btn btn-primary">+ Tambah Aset</Link>
      </div>

      {stats && (
        <div className="stat-grid">
          <div className="stat-card"><span>Total Aset</span><strong>{stats.totalAset}</strong></div>
          <div className="stat-card"><span>Lelang Berjalan</span><strong>{stats.asetBerjalan}</strong></div>
          <div className="stat-card"><span>Karyawan Terdaftar</span><strong>{stats.totalKaryawan}</strong></div>
          <div className="stat-card"><span>Total Penawaran</span><strong>{stats.totalBid}</strong></div>
        </div>
      )}

      <div className="filter-bar">
        <button className={`chip ${tab === "aset" ? "chip-aktif" : ""}`} onClick={() => setTab("aset")}>Semua Aset</button>
        <button className={`chip ${tab === "pemenang" ? "chip-aktif" : ""}`} onClick={() => setTab("pemenang")}>Pemenang Lelang</button>
      </div>

      {tab === "aset" && (
        <table className="tabel-bid">
          <thead>
            <tr>
              <th>Nama Aset</th>
              <th>Status</th>
              <th>Harga Awal</th>
              <th>Selesai</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td><Link to={`/aset/${a.id}`}>{a.nama_aset}</Link></td>
                <td>{a.status}</td>
                <td>{formatRupiah(a.harga_awal)}</td>
                <td>{new Date(a.selesai_at).toLocaleDateString("id-ID")}</td>
                <td className="tabel-aksi">
                  <Link to={`/admin/aset/${a.id}/ubah`}>Ubah</Link>
                  {a.status !== "dibatalkan" && (
                    <button className="btn-teks-bahaya" onClick={() => batalkan(a.id)}>Batalkan</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "pemenang" && (
        <table className="tabel-bid">
          <thead>
            <tr>
              <th>Aset</th>
              <th>Pemenang</th>
              <th>Harga Final</th>
            </tr>
          </thead>
          <tbody>
            {pemenang.length === 0 && (
              <tr><td colSpan={3}>Belum ada lelang yang selesai.</td></tr>
            )}
            {pemenang.map(({ asset, pemenang: p }) => (
              <tr key={asset.id}>
                <td>{asset.nama_aset}</td>
                <td>{p ? `${p.nama} (${p.email})` : "Tidak ada penawaran"}</td>
                <td>{p ? formatRupiah(p.jumlah) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
