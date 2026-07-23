// Builds a URL to the registered `api-server` artifact, which is mounted at
// the fixed path "/api" (see artifacts/api-server/.replit-artifact/artifact.toml).
// It proxies /api/telegram, /api/operator, /api/v1, /api/ai etc. straight
// through to the existing EPICGRAM backend (services/api/src/server.mjs) —
// no TDLib/operator logic is duplicated here, only forwarded.
export function apiUrl(path: string): string {
  return `/api${path.startsWith("/") ? path : "/" + path}`;
}
