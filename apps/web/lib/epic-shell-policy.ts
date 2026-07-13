// EPIC💀GRAM Shell Policy — enforce strict command allowlist before any exec

// ALLOWED WORK_DIRECTORIES
export const SHELL_ALLOWED_DIRS: Record<string, string> = {
  EPICGRAM_REPO: 'C:\\Users\\Admin\\agent-control',
  QCLAW_WORKSPACE: 'C:\\Users\\Admin\\.qclaw-oversea\\workspace',
};

export const SHELL_ALLOWED_COMMANDS: Record<string, { cmd: string; args: (arg?: unknown) => string[]; description: string }> = {
  git_status: {
    cmd: 'git',
    args: () => ['status', '--short'],
    description: 'Git working tree status',
  },
  git_diff: {
    cmd: 'git',
    args: () => ['diff', '--stat'],
    description: 'Git diff summary',
  },
  git_log: {
    cmd: 'git',
    args: () => ['log', '--oneline', '-10'],
    description: 'Last 10 commits',
  },
  npm_test: {
    cmd: 'npm',
    args: () => ['test', '--if-present'],
    description: 'Run npm test',
  },
  npm_build: {
    cmd: 'npm',
    args: () => ['run', 'build'],
    description: 'Build the project',
  },
  service_health: {
    cmd: 'curl',
    args: () => ['-s', '--max-time', '3', 'http://127.0.0.1:8788/health'],
    description: 'Check EPICGRAM backend health',
  },
  read_logs: {
    cmd: 'powershell',
    args: (path?: unknown) => ['-Command', `Get-Content "${path as string}" -Tail 20 -ErrorAction SilentlyContinue`],
    description: 'Read last 20 lines of a log file',
  },
  docker_ps: {
    cmd: 'docker',
    args: () => ['ps', '--format', '{{.Names}}\t{{.Status}}'],
    description: 'List running Docker containers',
  },
  docker_logs: {
    cmd: 'docker',
    args: (name?: unknown) => ['logs', (name as string).split('\n')[0], '--tail', '20'],
    description: 'Get container logs',
  },
  curl_local_health: {
    cmd: 'curl',
    args: (url?: unknown) => ['-s', '--max-time', '3', url as string],
    description: 'Check local HTTP endpoint health',
  },
};

// FORBIDDEN PATTERNS — checked before ANY shell execution
export const SHELL_FORBIDDEN_PATTERNS = [
  /powershell\s+-e/i,
  /cmd\s+\/c/i,
  /&\s*.*{/i,
  /\brsync\b/,
  /\bcp\s+-r\s+\/\b/,
  /\bmv\s+\/\b/,
  /\brm\s+-rf\b/,
  /\bdel\s+/i,
  /\brmdir\b/i,
  /\bformat\b/i,
  /\bdiskpart\b/i,
  /\breg\s+(add|delete)\b/i,
  /\bHKEY/i,
  /\bHKLM\b/,
  /\bHKCU\b/,
  /password/i,
  /secret/i,
  /credential/i,
  /\benv\b.*-p/i,
  /\$\(.*\)/,
  /\bnetsh\b/,
  /\bfirewall-cmd\b/,
  /\biptables\b/,
  /session_encrypted/i,
  /tdlib/i,
  /\.tdata\b/,
  /\.session\b/,
  /git\s+reset\s+--hard/i,
  /git\s+clean\s+-f/i,
  /git\s+push\s+--force/i,
  /--force\b.*push/i,
  /\bwget\b.*\|.*bash/i,
  /\bcurl\b.*\|.*sh/i,
];

export interface ShellExecutionRequest {
  command_id: string;
  args: unknown[];
  cwd_id: string;
  timeout_ms: number;
}

export interface ShellExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
}

export function buildShellCommand(req: ShellExecutionRequest): { cmd: string; args: string[]; cwd: string } {
  const entry = SHELL_ALLOWED_COMMANDS[req.command_id];
  if (!entry) throw new Error(`FORBIDDEN: command_id "${req.command_id}" not in allowlist`);
  const cwd = SHELL_ALLOWED_DIRS[req.cwd_id];
  if (!cwd) throw new Error(`FORBIDDEN: cwd_id "${req.cwd_id}" not in allowlist`);
  const args = req.args.length > 0 ? entry.args(...req.args) : entry.args();
  return { cmd: entry.cmd, args, cwd };
}
