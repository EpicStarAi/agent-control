"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AiStatus, SendResult, TgChat, TgMessage, TgStatus } from "./types";

// Central data hook for the Telegram-like client. Every network call targets our
// own /api/telegram/* and /api/ai/* routes — the server resolves the bound slot,
// enforces the owner match and the send gate. The browser never sends accountId
// for authorization and never talks to Telegram directly.

const MESSAGE_PAGE = 60;

function isReady(status: TgStatus | null): boolean {
  if (!status) return false;
  return (
    status.connected === true ||
    status.runtime === "owner_bound" ||
    status.runtime === "ready" ||
    status.ownerMatched === true
  );
}

async function getJson<T>(url: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export type TelegramClient = ReturnType<typeof useTelegramClient>;

export function useTelegramClient() {
  const [status, setStatus] = useState<TgStatus | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [chats, setChats] = useState<TgChat[]>([]);
  const [chatsMessage, setChatsMessage] = useState<string>("");
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [messages, setMessages] = useState<TgMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageLimit, setMessageLimit] = useState(MESSAGE_PAGE);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const statusLoadedRef = useRef(false);
  const [statusLoaded, setStatusLoaded] = useState(false);

  const ready = isReady(status);
  const activeAccountId = status?.activeAccountId ?? "";

  // ── Status polling ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const { data } = await getJson<TgStatus>("/api/telegram/status");
      if (cancelled || !data) return;
      setStatus(data);
      if (!statusLoadedRef.current) {
        statusLoadedRef.current = true;
        setStatusLoaded(true);
      }
    }
    sync();
    const timer = window.setInterval(sync, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // ── AI status polling (drives the operator panel meta) ───────────────────
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const { data } = await getJson<AiStatus>("/api/ai/status");
      if (!cancelled && data) setAiStatus(data);
    }
    sync();
    const timer = window.setInterval(sync, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // ── Chats polling ─────────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    if (!isReady(status)) {
      setChats([]);
      return;
    }
    const { ok, data } = await getJson<{ chats?: TgChat[]; message?: string }>("/api/telegram/chats?limit=40");
    if (!ok || !data) {
      setChatsMessage("Не удалось синхронизировать чаты");
      return;
    }
    setChats(Array.isArray(data.chats) ? data.chats : []);
    setChatsMessage(data.message ?? "");
  }, [status]);

  useEffect(() => {
    if (!ready) {
      setChats([]);
      return undefined;
    }
    let cancelled = false;
    const run = () => {
      if (!cancelled) loadChats();
    };
    run();
    const timer = window.setInterval(run, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ready, loadChats]);

  // Reset pagination when the selected chat changes.
  useEffect(() => {
    setMessageLimit(MESSAGE_PAGE);
    setHasMoreHistory(true);
    setMessages([]);
  }, [selectedChatId]);

  // ── Messages polling for the selected chat ────────────────────────────────
  useEffect(() => {
    if (!ready || !selectedChatId) {
      setMessages([]);
      setMessagesLoading(false);
      return undefined;
    }
    let cancelled = false;
    setMessagesLoading(true);
    async function load() {
      const { ok, data } = await getJson<{ messages?: TgMessage[] }>(
        `/api/telegram/messages?chatId=${encodeURIComponent(selectedChatId)}&limit=${messageLimit}`,
      );
      if (cancelled) return;
      if (ok && data) {
        const list = Array.isArray(data.messages) ? data.messages : [];
        // Backend returns newest-first; render oldest-first (chronological).
        const chronological = [...list].reverse();
        setMessages(chronological);
        if (list.length < messageLimit) setHasMoreHistory(false);
      }
      setMessagesLoading(false);
    }
    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ready, selectedChatId, messageLimit]);

  // Load older history. The messages route only accepts a `limit` (no cursor),
  // so we widen the window — honest given the current backend contract.
  const loadOlder = useCallback(() => {
    if (!hasMoreHistory) return;
    setMessageLimit((current) => current + MESSAGE_PAGE);
  }, [hasMoreHistory]);

  // ── Send (always passes through the server-side approval gate) ────────────
  const sendMessage = useCallback(
    async (chatId: string, text: string): Promise<SendResult> => {
      try {
        const res = await fetch("/api/telegram/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chatId, text }),
        });
        const data = (await res.json().catch(() => ({}))) as SendResult;
        return data;
      } catch {
        return { sent: false, message: "Бэкенд недоступен для отправки." };
      }
    },
    [],
  );

  // ── AI draft suggestion (review-only; never auto-sends) ───────────────────
  const requestSuggestion = useCallback(
    async (chatId: string, chatTitle: string | null, history: TgMessage[]): Promise<{ draft: string | null; error: string | null }> => {
      try {
        const res = await fetch("/api/ai/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: chatId, chatTitle, history }),
        });
        const data = (await res.json().catch(() => ({}))) as { draft?: string; error?: string };
        if (res.ok && data.draft) return { draft: data.draft, error: null };
        return { draft: null, error: data.error ?? "Не удалось получить черновик." };
      } catch {
        return { draft: null, error: "Бэкенд недоступен для AI-подсказки." };
      }
    },
    [],
  );

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  return {
    status,
    aiStatus,
    ready,
    statusLoaded,
    activeAccountId,
    chats,
    chatsMessage,
    selectedChatId,
    selectedChat,
    setSelectedChatId,
    messages,
    messagesLoading,
    hasMoreHistory,
    loadOlder,
    refreshChats: loadChats,
    sendMessage,
    requestSuggestion,
  };
}
