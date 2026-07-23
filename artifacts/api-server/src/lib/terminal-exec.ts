import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

// SECURITY NOTE: this allowlist blocks any line whose outer/chained command
// names aren't in ALLOWED_COMMANDS, but it cannot stop an *allowed* launcher
// (bash/sh/node/npm/npx/pnpm) from invoking something else internally
// (e.g. `node -e "require('child_process').execSync('wget ...')"`). Those
// three tools are full interpreters by nature — allowing them at all is a
// deliberate, explicitly-requested tradeoff (see EPICGRAM_TERMINAL_PASSWORD
// gate), not an oversight. The allowlist's real job is to stop someone who
// only has the "cat/ls/git/grep" style commands in mind from typing an
// unrelated arbitrary binary by accident, and to keep the *directly named*
// surface small and auditable. It is not a sandbox against a user who is
// deliberately trying to escape once they already hold a valid session.

// Restricted command allowlist for the in-app admin/technical terminal.
// Only these binaries may be invoked, regardless of how they're combined
// with shell operators (;, &&, ||, |, newlines). Anything else is refused
// before a shell process is ever spawned.
export const ALLOWED_COMMANDS = new Set([
  "bash",
  "sh",
  "node",
  "npm",
  "npx",
  "pnpm",
  "git",
  "find",
  "grep",
  "sed",
  "awk",
  "cat",
  "ls",
  "cp",
  "mv",
  "rm",
  "mkdir",
  "diff",
  "curl",
  "echo",
  "pwd",
  "cd",
  "true",
  "false",
]);

// Project root the terminal is confined to (the monorepo workspace root).
// Resolved relative to this bundled module's own runtime location
// (dist/index.mjs under artifacts/api-server/dist) rather than a hardcoded
// absolute path, so it keeps working if the workspace is relocated.
export const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../..");

/**
 * Extracts every leading command word from a shell line, splitting on
 * common shell operators. This is a best-effort static check, not a real
 * shell parser -- it exists to block obviously-disallowed binaries before
 * we ever hand the line to bash, not to guarantee perfect sandboxing.
 */
// Shared across extractCommandNames and findOutOfBoundsCd so allowlist
// checks and cd-confinement checks always see the same segments. Order
// matters: multi-char operators (&&, ||) must be matched before their
// single-char counterparts (&, |) or the regex would split "&&" into two
// bogus "&" segments.
const SEGMENT_SPLIT_RE = /(?:;|&&|\|\||&|\||\n)/g;

export function extractCommandNames(line: string): string[] {
  const segments = line
    .split(SEGMENT_SPLIT_RE)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const names: string[] = [];
  for (const segment of segments) {
    const match = segment.match(/^([^\s=]+)/);
    if (match) names.push(path.basename(match[1]));
  }
  return names;
}

// Command/process substitution and backticks let an inner command run
// without ever appearing as a leading segment word, which would make it
// invisible to the segment-based checks above. Rather than trying to parse
// these (which needs a real shell grammar), we refuse the whole line
// outright when any of these tokens are present.
const UNSUPPORTED_SYNTAX_RE = /\$\(|`|<\(|>\(/;

export function findUnsupportedSyntax(line: string): string | null {
  const match = line.match(UNSUPPORTED_SYNTAX_RE);
  return match ? match[0] : null;
}

export function checkCommandAllowed(line: string): { allowed: boolean; blocked?: string } {
  const unsupported = findUnsupportedSyntax(line);
  if (unsupported) return { allowed: false, blocked: `${unsupported} (command/process substitution not supported)` };

  const names = extractCommandNames(line);
  if (names.length === 0) return { allowed: false, blocked: "(empty command)" };
  for (const name of names) {
    if (!ALLOWED_COMMANDS.has(name)) {
      return { allowed: false, blocked: name };
    }
  }
  return { allowed: true };
}

const PROJECT_ROOT_REAL = fs.realpathSync(PROJECT_ROOT);

function isWithinRoot(candidate: string): boolean {
  const rel = path.relative(PROJECT_ROOT_REAL, candidate);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Resolves a `cd` target against the current cwd, confined to PROJECT_ROOT.
 * Uses realpath so symlinks can't be used to point outside the root.
 */
export function resolveCwd(currentCwd: string, target: string): { ok: true; cwd: string } | { ok: false; message: string } {
  const trimmed = target.trim();
  const nextRaw = trimmed === "" || trimmed === "~" ? PROJECT_ROOT_REAL : path.resolve(currentCwd, trimmed);
  let next: string;
  try {
    next = fs.realpathSync(path.resolve(nextRaw));
  } catch {
    return { ok: false, message: `cd: ${trimmed}: no such directory` };
  }
  if (!isWithinRoot(next)) {
    return { ok: false, message: `cd: refused — stays within ${PROJECT_ROOT_REAL}` };
  }
  return { ok: true, cwd: next };
}

/**
 * Scans a (possibly compound) line for any `cd` segment and validates its
 * target against PROJECT_ROOT, so `cd / && rm -rf whatever` is refused up
 * front instead of only checked when `cd` is the entire line.
 */
export function findOutOfBoundsCd(line: string, currentCwd: string): string | null {
  const segments = line
    .split(SEGMENT_SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean);

  let cwd = currentCwd;
  for (const segment of segments) {
    const match = segment.match(/^cd(?:\s+(.*))?$/);
    if (!match) continue;
    const result = resolveCwd(cwd, match[1] ?? "");
    if (!result.ok) return segment;
    cwd = result.cwd;
  }
  return null;
}

export interface ExecStreamHandlers {
  onStdout: (chunk: string) => void;
  onStderr: (chunk: string) => void;
  onExit: (code: number | null) => void;
}

/** Runs a single command line via bash -c, streaming output. */
export function runLine(line: string, cwd: string, handlers: ExecStreamHandlers): { kill: () => void } {
  const child = spawn("bash", ["-c", line], {
    cwd,
    env: { ...process.env, PS1: "$ " },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk: Buffer) => handlers.onStdout(chunk.toString("utf8")));
  child.stderr.on("data", (chunk: Buffer) => handlers.onStderr(chunk.toString("utf8")));
  child.on("close", (code) => handlers.onExit(code));
  child.on("error", (err) => {
    handlers.onStderr(`${err.message}\n`);
    handlers.onExit(1);
  });

  return { kill: () => child.kill("SIGKILL") };
}
