import React, { useEffect, useState } from "react";

function hitungSisaWaktu(target) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  const hari = Math.floor(diff / (1000 * 60 * 60 * 24));
  const jam = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const menit = Math.floor((diff / (1000 * 60)) % 60);
  const detik = Math.floor((diff / 1000) % 60);
  return { hari, jam, menit, detik };
}

export default function CountdownTimer({ selesaiAt, onSelesai }) {
  const [sisa, setSisa] = useState(() => hitungSisaWaktu(selesaiAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const baru = hitungSisaWaktu(selesaiAt);
      setSisa(baru);
      if (!baru && onSelesai) onSelesai();
    }, 1000);
    return () => clearInterval(interval);
  }, [selesaiAt]);

  if (!sisa) return <span className="countdown countdown-selesai">Lelang telah berakhir</span>;

  return (
    <span className="countdown">
      {sisa.hari > 0 && `${sisa.hari}h `}
      {String(sisa.jam).padStart(2, "0")}:{String(sisa.menit).padStart(2, "0")}:
      {String(sisa.detik).padStart(2, "0")}
    </span>
  );
}
