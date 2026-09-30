const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const BASE_URL = API_BASE ? `${API_BASE}/api` : "/api";

function getToken() {
  return localStorage.getItem("lelang_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Terjadi kesalahan yang tidak diketahui.");
  }
  return data;
}

async function downloadCsv(path, filename) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Gagal mengunduh file CSV.");
  }

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadExcel(path, filename) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Gagal mengunduh file Excel.");
  }

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function uploadExcel(path, file) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: await file.arrayBuffer(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal mengimpor file Excel.");
  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (payload) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),

  getAssets: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/assets${qs ? `?${qs}` : ""}`);
  },
  getAsset: (id) => request(`/assets/${id}`),
  createAsset: (payload) => request("/assets", { method: "POST", body: JSON.stringify(payload) }),
  updateAsset: (id, payload) => request(`/assets/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  cancelAsset: (id) => request(`/assets/${id}`, { method: "DELETE" }),

  placeBid: (asset_id, jumlah) =>
    request("/bids", { method: "POST", body: JSON.stringify({ asset_id, jumlah }) }),
  myBids: () => request("/bids/saya"),

  adminStats: () => request("/admin/stats"),
  adminUsers: () => request("/admin/users"),
  adminWinners: () => request("/admin/pemenang"),
  exportAdminUsers: () => downloadCsv("/admin/export/users.csv", "pengguna.csv"),
  exportAdminBids: () => downloadCsv("/admin/export/bids.csv", "aktivitas-bidding.csv"),
  exportAdminWinners: () => downloadCsv("/admin/export/pemenang.csv", "pemenang-lelang.csv"),
  exportAdminAssets: () => downloadExcel("/admin/export/assets.xlsx", "aset-lelang.xlsx"),
  importAdminAssets: (file) => uploadExcel("/admin/import/assets.xlsx", file),
};

export { getToken };
