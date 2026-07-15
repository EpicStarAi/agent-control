import type { Metadata, Viewport } from "next";
import TelegramNativeProfile from "@/components/tma/TelegramNativeProfile";

export const metadata: Metadata = {
  title: "EPIC💀GRAM AI — Профиль",
  description: "Telegram-native профиль с EPIC💀CLAW AI Operator",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090f",
};

export default function TelegramProfilePage() {
  return <TelegramNativeProfile />;
}
