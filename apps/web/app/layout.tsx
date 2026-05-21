import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "EPICGRAM",
  description: "Законный Telegram-style клиент с AI-рабочей областью.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EPICGRAM",
    statusBarStyle: "black-translucent"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        <div className="digital-rain" aria-hidden="true" />
        <div className="scan-lines" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
