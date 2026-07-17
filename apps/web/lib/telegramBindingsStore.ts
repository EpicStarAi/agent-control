// telegramBindingsStore.ts — File-system fallback for telegram_bindings (no PostgreSQL)
// Mirrors the pattern used by authStore.ts / connectionsStore.ts.
// Only used when DATABASE_URL is not set.

import {
  type TelegramBinding,
  type TelegramBindingAuthState,
  newBindingId,
} from "./telegramBindings";

type Store = { bindings: TelegramBinding[] };

const FILE = ".telegram-bindings.json";

function load(): Store {
  try {
    const path = `${process.cwd()}/${FILE}`;
    const { readFileSync } = require("node:fs");
    if (readFileSync) {
      const { readFileSync: rf } = require("node:fs");
      const data = rf(path, "utf8");
      return JSON.parse(data) as Store;
    }
  } catch { /* no file yet */ }
  return { bindings: [] };
}

function save(s: Store) {
  try {
    const { writeFileSync } = require("node:fs");
    writeFileSync(`${process.cwd()}/${FILE}`, JSON.stringify(s, null, 2));
  } catch { /* ignore */ }
}

export async function getByWorkspace(workspaceId: string): Promise<TelegramBinding | null> {
  const store = load();
  return store.bindings.find((b) => b.workspaceId === workspaceId) ?? null;
}

export async function getByTdlibAccount(tdlibAccountId: string): Promise<TelegramBinding | null> {
  const store = load();
  return store.bindings.find((b) => b.tdlibAccountId === tdlibAccountId) ?? null;
}

export async function getByUser(userId: string): Promise<TelegramBinding | null> {
  const store = load();
  const found = store.bindings
    .filter((b) => b.userId === userId)
    .sort((a, b) => new Date(b.boundAt).getTime() - new Date(a.boundAt).getTime());
  return found[0] ?? null;
}

export async function create(input: {
  workspaceId: string;
  userId: string;
  tdlibAccountId: string;
  displayName?: string;
}): Promise<TelegramBinding> {
  const store = load();
  const now = new Date().toISOString();
  const binding: TelegramBinding = {
    id: newBindingId(),
    workspaceId: input.workspaceId,
    userId: input.userId,
    tdlibAccountId: input.tdlibAccountId,
    displayName: input.displayName ?? "Telegram",
    phoneMasked: null,
    username: null,
    authState: "init",
    authError: null,
    boundAt: now,
    updatedAt: now,
  };
  store.bindings.push(binding);
  save(store);
  return binding;
}

export async function updateAuthState(input: {
  workspaceId: string;
  authState: TelegramBindingAuthState;
  authError?: string | null;
  phoneMasked?: string | null;
  username?: string | null;
}): Promise<TelegramBinding | null> {
  const store = load();
  const idx = store.bindings.findIndex((b) => b.workspaceId === input.workspaceId);
  if (idx < 0) return null;
  const b = store.bindings[idx];
  const updated: TelegramBinding = {
    ...b,
    authState: input.authState,
    authError: input.authError ?? b.authError,
    phoneMasked: input.phoneMasked ?? b.phoneMasked,
    username: input.username ?? b.username,
    updatedAt: new Date().toISOString(),
  };
  store.bindings[idx] = updated;
  save(store);
  return updated;
}

export async function remove(workspaceId: string): Promise<void> {
  const store = load();
  store.bindings = store.bindings.filter((b) => b.workspaceId !== workspaceId);
  save(store);
}

export async function healthCheck(): Promise<boolean> {
  try {
    const { readFileSync } = require("node:fs");
    readFileSync(`${process.cwd()}/${FILE}`, "utf8");
    return true;
  } catch {
    return true; // file doesn't exist yet — that's fine
  }
}
