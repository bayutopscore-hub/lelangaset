import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

function formatRupiah(angka) {
  return `Rp${Number(angka).toLocaleString("id-ID")}`;
}

export default function MyBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.myBids().then((res) => setBids(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Tawaran Saya</h1>
        <p>Riwayat semua penawaran yang pernah Anda pasang.</p>
      </div>
      {loading ? (
        <p>Memuat...</p>
      ) : bids.length === 0 ? (
        <p>Anda belum pernah memasang tawaran.</p>
      ) : (
        <table className="tabel-bid">
          <thead>
            <tr>
              <th>Aset</th>
              <th>Jumlah Tawaran</th>
              <th>Status Lelang</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bids.map((b) => (
              <tr key={b.id}>
                <td>{b.nama_aset}</td>
                <td>{formatRupiah(b.jumlah)}</td>
                <td>{b.status}</td>
                <td><Link to={`/aset/${b.asset_id}`}>Lihat detail →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
