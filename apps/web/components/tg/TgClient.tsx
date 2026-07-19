"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  ChevronLeft,
  Info,
  Menu,
  Moon,
  PanelLeftOpen,
  Search,
  Sun,
} from "lucide-react";
import { TelegramBindingWizard } from "../TelegramBindingWizard";
import { Avatar } from "./Avatar";
import { ChatList } from "./ChatList";
import { Composer } from "./Composer";
import { InfoPanel } from "./InfoPanel";
import { MessageThread } from "./MessageThread";
import { OperatorPanel } from "./OperatorPanel";
import { chatTypeLabel } from "./format";
import { useTelegramClient } from "./useTelegramClient";
import type { FolderId, RightPanel, TgChat, Theme } from "./types";

const THEME_KEY = "tgx-theme";

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = () =>
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  return [theme, toggle];
}

function SidebarMenu({
  theme,
  onToggleTheme,
  account,
  onClose,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  account: { displayName?: string | null; username?: string | null; phoneMasked?: string | null } | null;
  onClose: () => void;
}) {
  return (
    <>
      <button className="fixed inset-0 z-20 cursor-default" onClick={onClose} aria-label="Закрыть меню" />
      <div
        className="absolute left-2 top-14 z-30 w-64 overflow-hidden rounded-xl shadow-xl"
        style={{ background: "var(--tgx-sidebar-elevated)", border: "1px solid var(--tgx-border-strong)" }}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--tgx-border)" }}>
          <div className="text-[14px] font-semibold">{account?.displayName || "Telegram"}</div>
          <div className="text-[12px]" style={{ color: "var(--tgx-text-faint)" }}>
            {account?.username || account?.phoneMasked || "аккаунт не привязан"}
          </div>
        </div>
        <button
          onClick={() => {
            onToggleTheme();
            onClose();
          }}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13.5px] hover:opacity-80"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        </button>
      </div>
    </>
  );
}

export function TgClient() {
  const client = useTelegramClient();
  const [theme, toggleTheme] = useTheme();
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<FolderId>("all");
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [listCollapsed, setListCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const composerDisabled = !client.status?.mutationsEnabled; // send is server-gated; disabled until enabled

  const {
    ready,
    statusLoaded,
    chats,
    selectedChat,
    selectedChatId,
    setSelectedChatId,
    messages,
    messagesLoading,
    hasMoreHistory,
    loadOlder,
    aiStatus,
    status,
    sendMessage,
    requestSuggestion,
  } = client;

  const account = status?.account ?? null;

  // Reset draft when switching chats.
  const prevChat = useRef("");
  useEffect(() => {
    if (prevChat.current !== selectedChatId) {
      setDraft("");
      prevChat.current = selectedChatId;
    }
  }, [selectedChatId]);

  const chatOpen = Boolean(selectedChat);
  const subtitle = useMemo(() => {
    if (!selectedChat) return "";
    const parts: string[] = [chatTypeLabel(selectedChat)];
    if (selectedChat.username) parts.push(selectedChat.username);
    return parts.join(" · ");
  }, [selectedChat]);

  return (
    <main
      className="tgx tgx-scroll fixed inset-0 flex overflow-hidden"
      data-theme={theme}
      style={{ background: "var(--tgx-app-bg)", color: "var(--tgx-text)" }}
    >
      {/* Real per-user binding flow (auto-shows when there is no ready binding). */}
      <TelegramBindingWizard />

      {/* ── Chat list (sidebar) ─────────────────────────────────────────── */}
      <section
        className={`relative h-full min-h-0 w-full flex-col md:w-[340px] md:shrink-0 ${
          listCollapsed ? "md:hidden" : "md:flex"
        } ${chatOpen ? "hidden md:flex" : "flex"}`}
        style={{ background: "var(--tgx-sidebar-bg)", borderRight: "1px solid var(--tgx-border)" }}
      >
        <header className="shrink-0 px-2 py-2" style={{ background: "var(--tgx-header-bg)" }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
              style={{ color: "var(--tgx-text-secondary)" }}
              aria-label="Меню"
            >
              <Menu className="h-5 w-5" />
            </button>
            <label
              className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-3"
              style={{ background: "var(--tgx-app-bg)", color: "var(--tgx-text-secondary)" }}
            >
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск"
                className="w-full bg-transparent text-[14px] outline-none placeholder:opacity-70"
                style={{ color: "var(--tgx-text)" }}
              />
            </label>
            <button
              onClick={() => setListCollapsed(true)}
              className="hidden h-10 w-10 shrink-0 place-items-center rounded-full md:grid"
              style={{ color: "var(--tgx-text-secondary)" }}
              aria-label="Свернуть список"
              title="Свернуть список чатов"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
          {menuOpen ? (
            <SidebarMenu theme={theme} onToggleTheme={toggleTheme} account={account} onClose={() => setMenuOpen(false)} />
          ) : null}
        </header>

        {ready ? (
          <ChatList
            chats={chats}
            activeFolder={folder}
            onFolderChange={setFolder}
            query={query}
            selectedChatId={selectedChatId}
            onSelect={(id) => setSelectedChatId(id)}
            loading={!statusLoaded || (chats.length === 0)}
          />
        ) : (
          <SidebarEmptyState statusLoaded={statusLoaded} message={status?.message} />
        )}
      </section>

      {/* ── Chat area ───────────────────────────────────────────────────── */}
      <section
        className={`h-full min-h-0 min-w-0 flex-1 flex-col ${chatOpen ? "flex" : "hidden md:flex"}`}
        style={{ background: "var(--tgx-chat-bg)" }}
      >
        {selectedChat ? (
          <>
            <header
              className="flex shrink-0 items-center gap-3 px-3 py-2 md:px-4"
              style={{ background: "var(--tgx-header-bg)", borderBottom: "1px solid var(--tgx-border)" }}
            >
              <button
                onClick={() => setSelectedChatId("")}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full md:hidden"
                style={{ color: "var(--tgx-text-secondary)" }}
                aria-label="Назад"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {listCollapsed ? (
                <button
                  onClick={() => setListCollapsed(false)}
                  className="hidden h-9 w-9 shrink-0 place-items-center rounded-full md:grid"
                  style={{ color: "var(--tgx-text-secondary)" }}
                  aria-label="Показать список чатов"
                  title="Показать список чатов"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              ) : null}
              <Avatar title={selectedChat.title} photoFileId={selectedChat.photoSmallFileId} seed={selectedChat.id} size={42} />
              <button
                onClick={() => setRightPanel((p) => (p === "info" ? "none" : "info"))}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-[15px] font-semibold">{selectedChat.title}</div>
                <div className="truncate text-[12.5px]" style={{ color: "var(--tgx-text-faint)" }}>
                  {subtitle}
                </div>
              </button>
              <button
                onClick={() => setRightPanel((p) => (p === "operator" ? "none" : "operator"))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                style={{
                  color: rightPanel === "operator" ? "var(--tgx-accent)" : "var(--tgx-text-secondary)",
                  background: rightPanel === "operator" ? "var(--tgx-hover)" : "transparent",
                }}
                aria-label="AI-оператор"
                title="AI-оператор"
              >
                <Bot className="h-5 w-5" />
              </button>
              <button
                onClick={() => setRightPanel((p) => (p === "info" ? "none" : "info"))}
                className="hidden h-9 w-9 shrink-0 place-items-center rounded-full md:grid"
                style={{
                  color: rightPanel === "info" ? "var(--tgx-accent)" : "var(--tgx-text-secondary)",
                  background: rightPanel === "info" ? "var(--tgx-hover)" : "transparent",
                }}
                aria-label="Информация"
                title="Информация о чате"
              >
                <Info className="h-5 w-5" />
              </button>
            </header>

            <MessageThread
              chat={selectedChat}
              messages={messages}
              loading={messagesLoading}
              hasMore={hasMoreHistory}
              onLoadOlder={loadOlder}
            />

            <Composer
              disabled={composerDisabled}
              draft={draft}
              onDraftChange={setDraft}
              onSend={(text) => sendMessage(selectedChat.id, text)}
              placeholder="Написать сообщение…"
            />
          </>
        ) : (
          <ChatAreaEmptyState ready={ready} />
        )}
      </section>

      {/* ── Optional right panel (info / operator) ──────────────────────── */}
      {rightPanel !== "none" && selectedChat ? (
        <aside
          className="absolute inset-0 z-10 h-full w-full md:static md:z-0 md:w-[340px] md:shrink-0"
          style={{ borderLeft: "1px solid var(--tgx-border)" }}
        >
          {rightPanel === "operator" ? (
            <OperatorPanel
              chat={selectedChat}
              aiStatus={aiStatus}
              messages={messages}
              onRequestSuggestion={requestSuggestion}
              onUseDraft={(text) => {
                setDraft(text);
                setRightPanel("none");
              }}
              onClose={() => setRightPanel("none")}
            />
          ) : (
            <InfoPanel chat={selectedChat as TgChat} onClose={() => setRightPanel("none")} />
          )}
        </aside>
      ) : null}
    </main>
  );
}

function SidebarEmptyState({ statusLoaded, message }: { statusLoaded: boolean; message?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      {!statusLoaded ? (
        <div className="text-[13px]" style={{ color: "var(--tgx-text-faint)" }}>
          Проверка сессии…
        </div>
      ) : (
        <>
          <div className="text-[15px] font-semibold">Telegram не подключён</div>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--tgx-text-secondary)" }}>
            {message ||
              "К вашему профилю ещё не привязан Telegram-аккаунт. Подключите его, чтобы увидеть реальные чаты."}
          </p>
        </>
      )}
    </div>
  );
}

function ChatAreaEmptyState({ ready }: { ready: boolean }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div
        className="rounded-full px-4 py-2 text-center text-[13px]"
        style={{ background: "var(--tgx-date-chip-bg)", color: "var(--tgx-date-chip-text)" }}
      >
        {ready ? "Выберите чат, чтобы открыть переписку" : "Подключите Telegram, чтобы начать"}
      </div>
    </div>
  );
}
