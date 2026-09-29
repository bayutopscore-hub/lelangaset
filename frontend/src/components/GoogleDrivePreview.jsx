import React, { useMemo, useState } from "react";

const extractDriveId = (url) => {
  const match =
    url.match(/\/d\/([a-zA-Z0-9_-]{20,})/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  return match ? match[1] : null;
};

const thumbUrl = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

export default function GoogleDrivePreview({ value = "", onChange }) {
  const [failedSrc, setFailedSrc] = useState(null);

  // Kalau link Drive, ubah ke thumbnail. Kalau URL lain, pakai apa adanya.
  const driveId = useMemo(() => extractDriveId(value), [value]);
  const src = driveId ? thumbUrl(driveId) : value.trim();
  const isUrl = /^https?:\/\//i.test(src);
  const hasError = src && failedSrc === src;

  function handleChange(e) {
    const raw = e.target.value.trim();
    const id = extractDriveId(raw);
    // Simpan URL gambar langsung kalau input adalah link Drive
    onChange(id ? thumbUrl(id) : raw);
  }

  return (
    <div>
      <input
        name="foto_url"
        value={value}
        onChange={handleChange}
        placeholder="Tempel link Google Drive atau URL gambar"
      />

      {value && !isUrl && (
        <p style={{ color: "#b45309", fontSize: 13, margin: "6px 0 0" }}>
          Link harus diawali https://
        </p>
      )}

      {isUrl && !hasError && (
        <div style={{ marginTop: 10, textAlign: "center" }}>
          <img
            key={src}
            src={src}
            alt="Pratinjau foto aset"
            style={{
              maxWidth: "100%",
              maxHeight: 220,
              borderRadius: 8,
              border: "1px solid #ddd",
              objectFit: "contain",
            }}
            onError={() => setFailedSrc(src)}
          />
        </div>
      )}

      {hasError && (
        <p style={{ color: "#b91c1c", fontSize: 13, margin: "6px 0 0" }}>
          Gambar tidak dapat dimuat. Untuk Google Drive, pastikan akses file
          diatur ke "Siapa saja yang memiliki link".
        </p>
      )}
    </div>
  );
}