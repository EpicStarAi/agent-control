import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const workspaceRoot = process.cwd();
loadEnv({ path: path.join(workspaceRoot, ".env.local"), override: false, quiet: true });
loadEnv({ path: path.join(workspaceRoot, ".env"), override: false, quiet: true });

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

function codeSuffix() {
  return crypto.randomBytes(9).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

const count = Math.min(100, Math.max(1, Number(arg("count", "10")) || 10));
const prefix = String(arg("prefix", "pilot")).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 24) || "pilot";
const maxUses = Math.min(100, Math.max(1, Number(arg("max-uses", "1")) || 1));
const days = Math.min(365, Math.max(1, Number(arg("expires-days", "30")) || 30));
const createdAt = new Date();
const expiresAt = new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
const batch = createdAt.toISOString().slice(0, 10).replaceAll("-", "");

const codes = Array.from({ length: count }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  const label = `${prefix}-${batch}-${number}`;
  return {
    id: id("rc"),
    label,
    code: `EPICGRAM-${prefix.toUpperCase()}${number}-${codeSuffix()}`,
    status: "active",
    maxUses,
    usedCount: 0,
    createdBy: "epicgram-local-owner",
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
});

if (process.env.DATABASE_URL) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 4000 });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS referral_codes (
      id text PRIMARY KEY, code_hash text UNIQUE, label text, status text DEFAULT 'active',
      max_uses int DEFAULT 1, used_count int DEFAULT 0, created_by text,
      created_at timestamptz DEFAULT now(), expires_at timestamptz)`);
    for (const item of codes) {
      await pool.query(
        `INSERT INTO referral_codes(id,code_hash,label,status,max_uses,used_count,created_by,created_at,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (code_hash) DO NOTHING`,
        [item.id, sha256(item.code), item.label, item.status, item.maxUses, item.usedCount, item.createdBy, item.createdAt, item.expiresAt],
      );
    }
  } finally {
    await pool.end();
  }
}

const fallbackPath = path.join(workspaceRoot, ".auth-data.json");
let fallback = { codes: [], users: [], sessions: [], workspaces: [], redemptions: [] };
try {
  fallback = { ...fallback, ...JSON.parse(fs.readFileSync(fallbackPath, "utf8")) };
} catch {}
for (const item of codes) {
  fallback.codes.push({
    id: item.id,
    codeHash: sha256(item.code),
    label: item.label,
    status: item.status,
    maxUses: item.maxUses,
    usedCount: item.usedCount,
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
  });
}
fs.writeFileSync(fallbackPath, JSON.stringify(fallback, null, 2), { mode: 0o600 });

const accessDir = path.join(workspaceRoot, ".runtime", "access");
fs.mkdirSync(accessDir, { recursive: true, mode: 0o700 });
const outputPath = path.join(accessDir, `epicgram-${prefix}-codes-${createdAt.toISOString().replaceAll(":", "-")}.json`);
fs.writeFileSync(outputPath, JSON.stringify({ createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString(), codes }, null, 2), { mode: 0o600 });

console.log(outputPath);
