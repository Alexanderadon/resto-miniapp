import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineBanner } from "@/shared/ui/offline-banner";
import { TelegramInit } from "./telegram-init";

export const metadata: Metadata = {
  title: "Апорт — кафе в Алматы",
  description: "Меню, заказ и самовывоз — прямо в Telegram",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <TelegramInit />
        <OfflineBanner />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
