import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import CountdownTimer from "../components/CountdownTimer";
import { useAuth } from "../context/AuthContext";

function formatRupiah(angka) {
  return `Rp${Number(angka).toLocaleString("id-ID")}`;
}

function formatWaktu(iso) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function AssetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [jumlahBid, setJumlahBid] = useState("");
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState("");
  const [mengirim, setMengirim] = useState(false);

  async function muat() {
    try {
      const res = await api.getAsset(id);
      setAsset(res.data);
      setJumlahBid(res.data.bid_minimal_berikutnya);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    muat();
  }, [id]);

  async function submitBid(e) {
    e.preventDefault();
    setError("");
    setSukses("");
    setMengirim(true);
    try {
      await api.placeBid(asset.id, Number(jumlahBid));
      setSukses("Tawaran berhasil dikirim!");
      await muat();
    } catch (err) {
      setError(err.message);
    } finally {
      setMengirim(false);
    }
  }

  if (error && !asset) return <div className="container"><div className="alert-error">{error}</div></div>;
  if (!asset) return <div className="container">Memuat...</div>;

  const lelangAktif = asset.status_efektif === "berjalan";

  return (
    <div className="container asset-detail">
      <button className="btn btn-ghost" onClick={() => navigate(-1)}>&larr; Kembali</button>

      <div className="asset-detail-grid">
        <div className="asset-detail-foto">
          {asset.foto_url ? <img src={asset.foto_url} alt={asset.nama_aset} /> : <div className="asset-card-placeholder besar">📦</div>}
        </div>

        <div className="asset-detail-info">
          <span className={`badge badge-${asset.status_efektif}`}>{asset.status_efektif}</span>
          <h1>{asset.nama_aset}</h1>
          <p className="asset-detail-meta">
            {asset.kategori} &middot; Asal: {asset.cabang_asal} &middot; Kondisi: {asset.kondisi}
          </p>
          <p>{asset.deskripsi}</p>

          <div className="asset-detail-harga">
            <div>
              <span>Harga awal</span>
              <strong>{formatRupiah(asset.harga_awal)}</strong>
            </div>
            <div>
              <span>Tawaran tertinggi saat ini</span>
              <strong>{formatRupiah(asset.harga_tertinggi)}</strong>
              {asset.penawar_tertinggi && <small> oleh {asset.penawar_tertinggi}</small>}
            </div>
          </div>

          {lelangAktif && (
            <div className="asset-detail-timer">
              Berakhir dalam: <CountdownTimer selesaiAt={asset.selesai_at} onSelesai={muat} />
            </div>
          )}
          <p className="asset-detail-jadwal">
            Mulai: {formatWaktu(asset.mulai_at)} &nbsp;|&nbsp; Selesai: {formatWaktu(asset.selesai_at)}
          </p>

          {lelangAktif ? (
            <form className="bid-form" onSubmit={submitBid}>
              <label>Pasang tawaran Anda (minimal {formatRupiah(asset.bid_minimal_berikutnya)})</label>
              <div className="bid-form-row">
                <input
                  type="number"
                  min={asset.bid_minimal_berikutnya}
                  step={asset.kelipatan_bid}
                  value={jumlahBid}
                  onChange={(e) => setJumlahBid(e.target.value)}
                  required
                />
                <button className="btn btn-primary" disabled={mengirim}>
                  {mengirim ? "Mengirim..." : "Tawar Sekarang"}
                </button>
              </div>
            </form>
          ) : (
            <p className="alert-info">Lelang untuk aset ini tidak sedang berjalan.</p>
          )}

          {error && <div className="alert-error">{error}</div>}
          {sukses && <div className="alert-success">{sukses}</div>}
        </div>
      </div>

      <div className="riwayat-bid">
        <h2>Riwayat Penawaran ({asset.riwayat_bid.length})</h2>
        {asset.riwayat_bid.length === 0 ? (
          <p>Belum ada penawaran masuk.</p>
        ) : (
          <table className="tabel-bid">
            <thead>
              <tr>
                <th>Penawar</th>
                <th>Jumlah</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {asset.riwayat_bid.map((b, idx) => (
                <tr key={b.id} className={idx === 0 ? "bid-tertinggi" : ""}>
                  <td>{b.nama_penawar}{idx === 0 && " 🏆"}</td>
                  <td>{formatRupiah(b.jumlah)}</td>
                  <td>{formatWaktu(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
