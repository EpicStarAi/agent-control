import type { Server as HttpServer, IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { WebSocketServer, WebSocket } from "ws";
import { isValidSession, TERMINAL_SESSION_COOKIE } from "./terminal-sessions";
import { checkCommandAllowed, resolveCwd, runLine, findOutOfBoundsCd, findUnsupportedSyntax, PROJECT_ROOT } from "./terminal-exec";
import { logger } from "./logger";

const TERMINAL_WS_PATH = "/api/terminal/ws";

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

type ClientMessage = { type: "run"; line: string };
type ServerMessage =
  | { type: "stdout" | "stderr"; data: string }
  | { type: "exit"; code: number | null }
  | { type: "cwd"; cwd: string }
  | { type: "blocked"; command: string }
  | { type: "ready"; cwd: string };

function send(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

export function attachTerminalWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = new URL(req.url ?? "", "http://internal");
    if (url.pathname !== TERMINAL_WS_PATH) return; // let other upgrade handlers (if any) deal with it

    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[TERMINAL_SESSION_COOKIE];
    if (!isValidSession(token)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket) => {
    let cwd = PROJECT_ROOT;
    let activeKill: (() => void) | null = null;

    send(ws, { type: "ready", cwd });

    ws.on("message", (raw: Buffer) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString("utf8"));
      } catch {
        return;
      }
      if (message.type !== "run" || typeof message.line !== "string") return;
      const line = message.line;
      if (activeKill) return; // one command at a time

      const trimmed = line.trim();
      if (trimmed === "") {
        send(ws, { type: "exit", code: 0 });
        return;
      }

      const unsupported = findUnsupportedSyntax(trimmed);
      if (unsupported) {
        send(ws, { type: "stderr", data: `command/process substitution not supported: ${unsupported}\n` });
        send(ws, { type: "exit", code: 126 });
        return;
      }

      const badCd = findOutOfBoundsCd(trimmed, cwd);
      if (badCd) {
        send(ws, { type: "stderr", data: `refused — "${badCd}" would leave ${PROJECT_ROOT}\n` });
        send(ws, { type: "exit", code: 1 });
        return;
      }

      // `cd` is handled locally (only when it's the *entire* line, with no
      // other shell operators) so the working directory persists across
      // separately-spawned bash processes. Compound lines containing `cd`
      // alongside other commands are validated above and then executed as
      // one bash invocation, but the tracked `cwd` for *future* lines is
      // intentionally left unchanged (bash's cd there is local to that
      // subprocess only).
      const cdMatch = /[;&|\n]/.test(trimmed) ? null : trimmed.match(/^cd(?:\s+(.*))?$/);
      if (cdMatch) {
        const result = resolveCwd(cwd, cdMatch[1] ?? "");
        if (!result.ok) {
          send(ws, { type: "stderr", data: `${result.message}\n` });
          send(ws, { type: "exit", code: 1 });
          return;
        }
        cwd = result.cwd;
        send(ws, { type: "cwd", cwd });
        send(ws, { type: "exit", code: 0 });
        return;
      }

      const check = checkCommandAllowed(trimmed);
      if (!check.allowed) {
        send(ws, { type: "blocked", command: check.blocked ?? "" });
        send(ws, {
          type: "stderr",
          data: `command not allowed: ${check.blocked}\n`,
        });
        send(ws, { type: "exit", code: 126 });
        return;
      }

      const { kill } = runLine(trimmed, cwd, {
        onStdout: (chunk) => send(ws, { type: "stdout", data: chunk }),
        onStderr: (chunk) => send(ws, { type: "stderr", data: chunk }),
        onExit: (code) => {
          activeKill = null;
          send(ws, { type: "exit", code });
        },
      });
      activeKill = kill;
    });

    ws.on("close", () => {
      if (activeKill) activeKill();
    });
  });

  logger.info({ path: TERMINAL_WS_PATH }, "Terminal WebSocket attached");
}
