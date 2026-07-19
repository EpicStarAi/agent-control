"use client";

import { X } from "lucide-react";
import { Avatar } from "./Avatar";
import { chatTypeLabel } from "./format";
import type { TgChat } from "./types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--tgx-border)" }}>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--tgx-text-faint)" }}>
        {label}
      </div>
      <div className="mt-0.5 text-[14px]" style={{ color: "var(--tgx-text)" }}>
        {value}
      </div>
    </div>
  );
}

// Optional third panel: chat details built purely from the real chat record.
export function InfoPanel({ chat, onClose }: { chat: TgChat; onClose: () => void }) {
  const unread = chat.unreadCount ?? 0;
  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: "var(--tgx-sidebar-bg)" }}>
      <div className="flex shrink-0 items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--tgx-border)" }}>
        <div className="flex-1 text-[14px] font-semibold">Информация</div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ color: "var(--tgx-text-secondary)" }} aria-label="Закрыть панель">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto tgx-scroll">
        <div className="flex flex-col items-center px-4 py-6" style={{ borderBottom: "1px solid var(--tgx-border)" }}>
          <Avatar title={chat.title} photoFileId={chat.photoSmallFileId} seed={chat.id} size={96} />
          <div className="mt-3 text-center text-[17px] font-semibold">{chat.title}</div>
          <div className="mt-0.5 text-[13px]" style={{ color: "var(--tgx-text-faint)" }}>
            {chatTypeLabel(chat)}
          </div>
        </div>
        {chat.username ? <Row label="Имя пользователя" value={chat.username} /> : null}
        <Row label="Тип" value={chatTypeLabel(chat)} />
        {unread > 0 ? <Row label="Непрочитано" value={String(unread)} /> : null}
      </div>
    </div>
  );
}
