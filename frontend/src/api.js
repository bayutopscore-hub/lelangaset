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
};

export { getToken };
