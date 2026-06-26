import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

// Workspace-root env loading. `next dev apps/web` makes Next look for env files
// inside apps/web, but our canonical .env / .env.local live at the workspace root
// (next to .env.example). Resolve the workspace root from this file's own location
// — independent of process.cwd() so it works under any invocation. override:false
// keeps any pre-existing process.env (CI, shell, secrets manager) authoritative.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..", "..");
loadEnv({ path: path.join(workspaceRoot, ".env.local"), override: false });
loadEnv({ path: path.join(workspaceRoot, ".env"),       override: false });

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.68.101", "127.0.0.1:3015", "localhost:3015", "192.168.68.101:3015"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
