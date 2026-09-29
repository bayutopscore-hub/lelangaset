require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../db");

async function backup() {
  const configuredDir = process.env.BACKUP_DIR || "backups";
  const backupDir = path.resolve(__dirname, "..", configuredDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(backupDir, `lelang-${timestamp}.db`);

  fs.mkdirSync(backupDir, { recursive: true });
  const result = await db.backup(destination);
  console.log(`Backup selesai: ${destination} (${result.totalPages} halaman).`);
  db.close();
}

backup().catch((error) => {
  console.error("Backup database gagal:", error.message);
  db.close();
  process.exitCode = 1;
});
