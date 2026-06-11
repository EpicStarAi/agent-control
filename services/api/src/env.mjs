import { readFile } from "node:fs/promises";
import path from "node:path";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex === -1) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return key ? [key, value] : null;
}

export async function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");

  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Local env is optional. Production deployments should provide real environment variables.
  }
}
