import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import CountdownTimer from "../components/CountdownTimer";

const LABEL_STATUS = {
  akan_datang: "Akan Datang",
  berjalan: "Sedang Berjalan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  draft: "Draft",
};

function formatRupiah(angka) {
  return `Rp${Number(angka).toLocaleString("id-ID")}`;
}

export default function AssetList() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  async function muat() {
    setLoading(true);
    try {
      const res = await api.getAssets(filterStatus ? { status: filterStatus } : {});
      setAssets(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    muat();
  }, [filterStatus]);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Aset Tersedia untuk Dilelang</h1>
        <p>Aset dari cabang non-aktif, khusus penawaran internal karyawan.</p>
      </div>

      <div className="filter-bar">
        {["", "akan_datang", "berjalan", "selesai"].map((s) => (
          <button
            key={s}
            className={`chip ${filterStatus === s ? "chip-aktif" : ""}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === "" ? "Semua" : LABEL_STATUS[s]}
          </button>
        ))}
      </div>

      {error && <div className="alert-error">{error}</div>}
      {loading ? (
        <p>Memuat aset...</p>
      ) : assets.length === 0 ? (
        <p>Belum ada aset pada kategori ini.</p>
      ) : (
        <div className="asset-grid">
          {assets.map((a) => (
            <Link to={`/aset/${a.id}`} key={a.id} className="asset-card">
              <div className="asset-card-foto">
                {a.foto_url ? <img src={a.foto_url} alt={a.nama_aset} /> : <div className="asset-card-placeholder">📦</div>}
                <span className={`badge badge-${a.status_efektif}`}>{LABEL_STATUS[a.status_efektif]}</span>
              </div>
              <div className="asset-card-body">
                <h3>{a.nama_aset}</h3>
                <p className="asset-card-cabang">{a.cabang_asal}</p>
                <div className="asset-card-harga">
                  <span>Tawaran tertinggi</span>
                  <strong>{formatRupiah(a.harga_tertinggi)}</strong>
                </div>
                <div className="asset-card-footer">
                  <span>{a.jumlah_bid} penawaran</span>
                  {a.status_efektif === "berjalan" && <CountdownTimer selesaiAt={a.selesai_at} />}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
