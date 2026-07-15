"use client";

import { useEffect } from "react";

const ONBOARDING_RE = /(с\s+чего(?:\s+нам)?\s+(?:лучше\s+)?начать|как\s+лучше\s+начать|что\s+делать\s+дальше|давай\s+начн[её]м|помоги\s+настроить\s+аккаунт|проведи\s+интервью)/i;

const PRODUCT_REPLY = `Начнём с короткой настройки EPIC💀GRAM — без технических команд и работы с кодом.

Я помогу:
— проанализировать Telegram-аккаунт;
— организовать папки, группы и каналы;
— создать контент-план;
— подготовить тексты, аватары, изображения и видео;
— настроить источники и автопубликацию;
— выполнять действия только после подтверждения.

Первый вопрос: для чего ты хочешь использовать этот аккаунт?

1. Новостной канал
2. Личный бренд
3. Продажи или услуги
4. Сеть каналов
5. Автоматизация контента
6. Другая задача`;

export function OperatorOnboardingGuard() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("/api/operator/command") && init?.method?.toUpperCase() === "POST") {
        try {
          const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
          const command = String(body?.command ?? body?.text ?? "").trim();

          if (ONBOARDING_RE.test(command)) {
            return new Response(JSON.stringify({ ok: true, text: PRODUCT_REPLY, intent: "planning", onboarding: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
        } catch {
          // Fall through to the real runtime when the request body is not JSON.
        }
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
