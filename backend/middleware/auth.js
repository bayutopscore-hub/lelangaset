const jwt = require("jsonwebtoken");

function authWajib(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Token tidak ditemukan. Silakan login." });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role, nama }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token tidak valid atau kedaluwarsa." });
  }
}

function hanyaAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Akses ditolak. Hanya untuk admin." });
  }
  next();
}

module.exports = { authWajib, hanyaAdmin };
