import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import TelegramInit from "../components/TelegramInit";
import DynamicOperatorWindowEnhancer from "../components/DynamicOperatorWindowEnhancer";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "EPIC☠️GRAM",
  description: "Законный Telegram-style клиент с AI-рабочей областью.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EPIC☠️GRAM",
    statusBarStyle: "black-translucent"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <TelegramInit />
        <DynamicOperatorWindowEnhancer />
        <div className="digital-rain" aria-hidden="true" />
        <div className="scan-lines" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
