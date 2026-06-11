import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EPIC☠️GRAM",
    short_name: "EPIC☠️GRAM",
    description: "Telegram-style клиент с AI-агентами и безопасным подтверждением отправки.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0e1621",
    theme_color: "#17212b",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
