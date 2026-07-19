"use client";

import { useMemo } from "react";
import { Bot, Megaphone, Pin, Users } from "lucide-react";
import { Avatar } from "./Avatar";
import {
  chatMatchesFolder,
  chatMatchesSearch,
  formatListStamp,
  lastMessagePreview,
} from "./format";
import type { FolderId, TgChat } from "./types";

const FOLDERS: Array<{ id: FolderId; label: string }> = [
  { id: "all", label: "Все" },
  { id: "unread", label: "Непрочитанные" },
  { id: "private", label: "Личные" },
  { id: "groups", label: "Группы" },
  { id: "channels", label: "Каналы" },
  { id: "bots", label: "Боты" },
  { id: "archive", label: "Архив" },
];

function CategoryIcon({ chat }: { chat: TgChat }) {
  const cls = "h-3.5 w-3.5 text-[var(--tgx-text-faint)]";
  if (chat.category === "channel" || chat.isChannel) return <Megaphone className={cls} />;
  if (chat.category === "group") return <Users className={cls} />;
  if (chat.category === "bot" || chat.isBot) return <Bot className={cls} />;
  return null;
}

function ChatRow({
  chat,
  active,
  onClick,
}: {
  chat: TgChat;
  active: boolean;
  onClick: () => void;
}) {
  const unread = chat.unreadCount ?? 0;
  const showUnread = unread > 0 || chat.isMarkedAsUnread;
  const preview = lastMessagePreview(chat);
  const stamp = formatListStamp(chat.lastMessage?.date);

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-2 py-2 text-left transition-colors"
      style={{
        background: active ? "var(--tgx-active)" : "transparent",
        color: active ? "var(--tgx-active-text)" : "var(--tgx-text)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--tgx-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <Avatar title={chat.title} photoFileId={chat.photoSmallFileId} seed={chat.id} size={54} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-[15px] font-semibold">
            <CategoryIcon chat={chat} />
            <span className="truncate">{chat.title}</span>
          </span>
          <span
            className="ml-auto shrink-0 text-xs"
            style={{ color: active ? "rgba(255,255,255,0.75)" : "var(--tgx-text-faint)" }}
          >
            {stamp}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className="min-w-0 flex-1 truncate text-[13.5px]"
            style={{ color: active ? "rgba(255,255,255,0.85)" : "var(--tgx-text-secondary)" }}
          >
            {preview || <span className="italic opacity-70">нет сообщений</span>}
          </span>
          {chat.isPinned && !showUnread ? (
            <Pin
              className="h-3.5 w-3.5 shrink-0 rotate-45"
              style={{ color: active ? "rgba(255,255,255,0.7)" : "var(--tgx-text-faint)" }}
            />
          ) : null}
          {showUnread ? (
            <span
              className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold"
              style={{
                background: active ? "#ffffff" : "var(--tgx-badge)",
                color: active ? "var(--tgx-active)" : "var(--tgx-badge-text)",
              }}
            >
              {unread > 0 ? (unread > 999 ? "999+" : unread) : " "}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function ChatList({
  chats,
  activeFolder,
  onFolderChange,
  query,
  selectedChatId,
  onSelect,
  loading,
}: {
  chats: TgChat[];
  activeFolder: FolderId;
  onFolderChange: (folder: FolderId) => void;
  query: string;
  selectedChatId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const visible = useMemo(
    () => chats.filter((chat) => chatMatchesFolder(chat, activeFolder) && chatMatchesSearch(chat, query)),
    [chats, activeFolder, query],
  );

  const pinned = visible.filter((chat) => chat.isPinned);
  const regular = visible.filter((chat) => !chat.isPinned);

  const folderCount = (id: FolderId) => chats.filter((chat) => chatMatchesFolder(chat, id)).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex shrink-0 gap-1 overflow-x-auto px-2 py-1.5 tgx-scroll"
        style={{ borderBottom: "1px solid var(--tgx-border)" }}
      >
        {FOLDERS.map((folder) => {
          const isActive = folder.id === activeFolder;
          const count = folder.id === "all" ? 0 : folderCount(folder.id);
          return (
            <button
              key={folder.id}
              onClick={() => onFolderChange(folder.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors"
              style={{
                background: isActive ? "var(--tgx-active)" : "transparent",
                color: isActive ? "var(--tgx-active-text)" : "var(--tgx-text-secondary)",
              }}
            >
              {folder.label}
              {count > 0 ? (
                <span
                  className="rounded-full px-1.5 text-[11px]"
                  style={{ background: isActive ? "rgba(255,255,255,0.22)" : "var(--tgx-hover)" }}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto tgx-scroll px-1 py-1">
        {visible.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--tgx-text-faint)" }}>
            {loading
              ? "Загрузка чатов…"
              : query.trim()
                ? `Ничего не найдено по запросу «${query.trim()}»`
                : "В этой папке пока нет чатов"}
          </div>
        ) : (
          <>
            {pinned.length > 0 ? (
              <>
                <div
                  className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--tgx-text-faint)" }}
                >
                  Закреплённые
                </div>
                {pinned.map((chat) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    active={chat.id === selectedChatId}
                    onClick={() => onSelect(chat.id)}
                  />
                ))}
                <div className="my-1" style={{ borderTop: "1px solid var(--tgx-border)" }} />
              </>
            ) : null}
            {regular.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                active={chat.id === selectedChatId}
                onClick={() => onSelect(chat.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
