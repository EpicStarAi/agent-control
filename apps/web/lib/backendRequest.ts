export function backendRequestHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  headers.set("cache-control", "no-store");

  const token = String(process.env.EPICGRAM_BACKEND_SERVICE_TOKEN || "").trim();
  if (token) headers.set("authorization", `Bearer ${token}`);

  return headers;
}
