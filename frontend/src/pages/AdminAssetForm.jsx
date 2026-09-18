import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

function keInputDatetime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const KOSONG = {
  nama_aset: "",
  deskripsi: "",
  kategori: "",
  cabang_asal: "",
  kondisi: "baik",
  foto_url: "",
  harga_awal: 100000,
  kelipatan_bid: 50000,
  mulai_at: "",
  selesai_at: "",
  status: "berjalan",
};

export default function AdminAssetForm() {
  const { id } = useParams();
  const editMode = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(KOSONG);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editMode) {
      api.getAsset(id).then((res) => {
        const a = res.data;
        setForm({
          ...a,
          mulai_at: keInputDatetime(a.mulai_at),
          selesai_at: keInputDatetime(a.selesai_at),
        });
      });
    } else {
      const sekarang = new Date();
      const seminggu = new Date(sekarang.getTime() + 1000 * 60 * 60 * 24 * 7);
      setForm({ ...KOSONG, mulai_at: keInputDatetime(sekarang), selesai_at: keInputDatetime(seminggu) });
    }
  }, [id]);

  function ubah(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        harga_awal: Number(form.harga_awal),
        kelipatan_bid: Number(form.kelipatan_bid),
        mulai_at: new Date(form.mulai_at).toISOString(),
        selesai_at: new Date(form.selesai_at).toISOString(),
      };
      if (editMode) {
        await api.updateAsset(id, payload);
      } else {
        await api.createAsset(payload);
      }
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>{editMode ? "Ubah Aset" : "Tambah Aset Baru"}</h1>
      </div>

      <form className="form-card" onSubmit={submit}>
        <label>Nama Aset</label>
        <input name="nama_aset" value={form.nama_aset} onChange={ubah} required />

        <label>Deskripsi</label>
        <textarea name="deskripsi" value={form.deskripsi} onChange={ubah} rows={4} />

        <div className="form-grid-2">
          <div>
            <label>Kategori</label>
            <input name="kategori" value={form.kategori} onChange={ubah} placeholder="Furnitur, Elektronik, Kendaraan, ..." />
          </div>
          <div>
            <label>Cabang Asal</label>
            <input name="cabang_asal" value={form.cabang_asal} onChange={ubah} />
          </div>
        </div>

        <div className="form-grid-2">
          <div>
            <label>Kondisi</label>
            <select name="kondisi" value={form.kondisi} onChange={ubah}>
              <option value="baik">Baik</option>
              <option value="perlu_perbaikan">Perlu Perbaikan</option>
              <option value="rusak_ringan">Rusak Ringan</option>
            </select>
          </div>
          <div>
            <label>URL Foto (opsional)</label>
            <input name="foto_url" value={form.foto_url} onChange={ubah} placeholder="https://..." />
          </div>
        </div>

        <div className="form-grid-2">
          <div>
            <label>Harga Awal (Rp)</label>
            <input type="number" name="harga_awal" value={form.harga_awal} onChange={ubah} min={0} required />
          </div>
          <div>
            <label>Kelipatan Tawaran (Rp)</label>
            <input type="number" name="kelipatan_bid" value={form.kelipatan_bid} onChange={ubah} min={1000} required />
          </div>
        </div>

        <div className="form-grid-2">
          <div>
            <label>Waktu Mulai</label>
            <input type="datetime-local" name="mulai_at" value={form.mulai_at} onChange={ubah} required />
          </div>
          <div>
            <label>Waktu Selesai</label>
            <input type="datetime-local" name="selesai_at" value={form.selesai_at} onChange={ubah} required />
          </div>
        </div>

        <label>Status</label>
        <select name="status" value={form.status} onChange={ubah}>
          <option value="draft">Draft (belum terlihat karyawan)</option>
          <option value="berjalan">Berjalan</option>
          <option value="dibatalkan">Dibatalkan</option>
        </select>

        {error && <div className="alert-error">{error}</div>}

        <div className="form-aksi">
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/admin")}>Batal</button>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Menyimpan..." : editMode ? "Simpan Perubahan" : "Buat Aset"}
          </button>
        </div>
      </form>
    </div>
  );
}
