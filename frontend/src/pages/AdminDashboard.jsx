import React, { useEffect, useRef, useState } from "react";
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
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const inputExcelRef = useRef(null);

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

  async function imporAset(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !window.confirm("Impor aset dari file ini? Baris tanpa ID akan ditambahkan, sedangkan ID yang cocok akan diperbarui. Data lain tidak dihapus.")) return;

    setImporting(true);
    setImportStatus(null);
    try {
      const result = await api.importAdminAssets(file);
      setImportStatus({
        type: "success",
        text: `Impor selesai: ${result.data.ditambahkan} aset ditambahkan dan ${result.data.diperbarui} aset diperbarui.`,
      });
      await muat();
    } catch (error) {
      setImportStatus({ type: "error", text: error.message });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header page-header-row">
        <div>
          <h1>Panel Admin</h1>
          <p>Kelola aset lelang internal dan pantau hasilnya.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={() => api.exportAdminAssets()}>Excel Aset</button>
          <button className="btn btn-ghost" onClick={() => inputExcelRef.current?.click()} disabled={importing}>
            {importing ? "Mengimpor..." : "Impor Excel"}
          </button>
          <button className="btn btn-ghost" onClick={() => api.exportAdminUsers()}>CSV Pengguna</button>
          <button className="btn btn-ghost" onClick={() => api.exportAdminBids()}>CSV Aktivitas Bid</button>
          <button className="btn btn-ghost" onClick={() => api.exportAdminWinners()}>CSV Pemenang</button>
          <Link to="/admin/aset/baru" className="btn btn-primary">+ Tambah Aset</Link>
        </div>
      </div>

      <input ref={inputExcelRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={imporAset} />
      {importStatus && <div className={`alert-${importStatus.type}`}>{importStatus.text}</div>}

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
