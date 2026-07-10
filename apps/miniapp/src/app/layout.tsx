import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineBanner } from "@/shared/ui/offline-banner";
import { TelegramInit } from "./telegram-init";

export const metadata: Metadata = {
  title: "Апорт — кафе в Алматы",
  description: "Меню, заказ и самовывоз — прямо в Telegram",
};

// Без запрета зума: user-scalable=no валит a11y (WCAG 1.4.4), а двойной
// тап-зум на кнопках уже отключён через touch-action: manipulation.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
