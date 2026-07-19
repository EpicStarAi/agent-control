"use client";

import Link from "next/link";
import {
  Home, Bot, Inbox, CheckCircle2, Building2, Handshake, MessageCircle, Users, Radio,
  Cpu, Image as ImageIcon, LineChart, BarChart3, Wallet, Coins, Wrench, BookOpen,
  Server, ShieldCheck, Settings, GraduationCap, type LucideIcon,
} from "lucide-react";

// Reference-structured navigation (mirrors the gh-pages preview sidebar groups).
//
// HONESTY RULE: an item is only a real link when it has a destination that
// actually exists. Sections without a real page render as a non-clickable
// "готовится" (in preparation) row — never a fake link, never invented metrics.
// The reference's demo numbers (token balances, mission counts, etc.) are NOT
// reproduced here; where data would go and none is real, we say so plainly.

type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;              // real, existing route
  action?: "operator";        // opens the in-client operator dock
  ready: boolean;             // false => rendered as "готовится"
};
type NavGroup = { title: string; items: NavItem[] };

// `ready:false` items intentionally have no href — they are sections from the
// reference layout that have no real backing data yet. Keeping them visible (as
// disabled) tells a new user the map of the product without pretending the
// section works.
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Оператор",
    items: [
      { label: "Главная", icon: Home, href: "/client", ready: true },
      { label: "AI Оператор", icon: Bot, action: "operator", ready: true },
      { label: "Центр миссий", icon: Inbox, href: "/missions", ready: true },
      { label: "Подтверждения", icon: CheckCircle2, action: "operator", ready: true },
    ],
  },
  {
    title: "Организация",
    items: [
      { label: "Организация", icon: Building2, ready: false },
      { label: "Партнёры", icon: Handshake, ready: false },
    ],
  },
  {
    title: "Производство",
    items: [
      { label: "Рабочий стол", icon: MessageCircle, href: "/client", ready: true },
      { label: "Аккаунты", icon: Users, href: "/accounts", ready: true },
      { label: "Каналы", icon: Radio, href: "/chats", ready: true },
      { label: "AI Агенты", icon: Cpu, href: "/agents", ready: true },
      { label: "Медиацентр", icon: ImageIcon, href: "/media-studio", ready: true },
    ],
  },
  {
    title: "Маркетинг и аналитика",
    items: [
      { label: "Маркетинг", icon: LineChart, ready: false },
      { label: "Аналитика", icon: BarChart3, ready: false },
      { label: "Экономика", icon: Coins, ready: false },
      { label: "Кошелёк", icon: Wallet, ready: false },
    ],
  },
  {
    title: "Инструменты",
    items: [
      { label: "Инструменты AI", icon: Wrench, href: "/services", ready: true },
    ],
  },
  {
    title: "Инфраструктура",
    items: [
      { label: "База знаний", icon: BookOpen, ready: false },
      { label: "Инфраструктура", icon: Server, ready: false },
      { label: "Безопасность", icon: ShieldCheck, href: "/logs", ready: true },
      { label: "Настройки", icon: Settings, href: "/settings", ready: true },
    ],
  },
];

export function SectionNav({
  onNavigate,
  onOpenOperator,
  onOpenOnboarding,
}: {
  onNavigate?: () => void;
  onOpenOperator?: () => void;
  onOpenOnboarding?: () => void;
}) {
  return (
    <nav className="py-2" aria-label="Разделы">
      <button
        type="button"
        onClick={() => { onOpenOnboarding?.(); onNavigate?.(); }}
        className="flex w-full items-center gap-4 px-5 py-3 text-left text-sm text-tg-text hover:bg-tg-hover"
      >
        <GraduationCap className="h-5 w-5 text-tg-accent" />
        <span className="flex-1">Онбординг</span>
        <span className="rounded-full border border-tg-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-tg-muted">гид</span>
      </button>
      <div className="my-1 border-t border-tg-line" />

      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="py-1">
          <div className="px-5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-tg-muted/70">
            {group.title}
          </div>
          {group.items.map((item) => {
            const Icon = item.icon;
            if (item.action === "operator") {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => { onOpenOperator?.(); onNavigate?.(); }}
                  className="flex w-full items-center gap-4 px-5 py-2.5 text-left text-sm text-tg-text hover:bg-tg-hover"
                >
                  <Icon className="h-5 w-5 text-tg-muted" />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            }
            if (item.ready && item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => onNavigate?.()}
                  className="flex items-center gap-4 px-5 py-2.5 text-sm text-tg-text hover:bg-tg-hover"
                >
                  <Icon className="h-5 w-5 text-tg-muted" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            }
            // Not ready: honest "готовится" row — no link, no fake data.
            return (
              <div
                key={item.label}
                className="flex items-center gap-4 px-5 py-2.5 text-sm text-tg-muted/60"
                aria-disabled="true"
                title="Раздел готовится"
              >
                <Icon className="h-5 w-5 text-tg-muted/40" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full bg-tg-hover px-2 py-0.5 text-[10px] uppercase tracking-wide text-tg-muted/70">
                  готовится
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
