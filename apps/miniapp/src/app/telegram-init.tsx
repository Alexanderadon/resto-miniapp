"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Инициализация Telegram Mini App при монтировании (ADR-001 §3, §8):
 * ready() + expand(), тема (data-theme="dark" на <html> + подписка на смену),
 * обмен initDataRaw на серверную сессию (POST /api/auth/session, 1 ретрай).
 *
 * Вне Telegram (dev в браузере, SSR) — тихий no-op без крэша.
 */

/** Тема применяется к <html>: тёмная — атрибут, светлая — его отсутствие. */
function applyTheme(isDark: boolean): void {
  const root = document.documentElement;
  if (isDark) {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
}

async function postInitData(initDataRaw: string): Promise<boolean> {
  // Один ретрай: мобильная сеть в webview нестабильна (ui-spec «Offline»).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ initDataRaw }),
      });
      if (response.ok) return true;
      console.warn(
        `[telegram-init] auth attempt ${attempt + 1} failed: HTTP ${response.status}`,
      );
    } catch (error) {
      console.warn(
        `[telegram-init] auth attempt ${attempt + 1} network error`,
        error,
      );
    }
  }
  return false;
}

// Модульный флаг: эффект в dev (StrictMode) монтируется дважды —
// инициализацию SDK и POST сессии выполняем один раз на загрузку страницы.
let initStarted = false;

export function TelegramInit() {
  const router = useRouter();

  useEffect(() => {
    if (initStarted) return;
    initStarted = true;

    let unsubTheme: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      // Динамический импорт: SDK трогает window, в SSR-бандл не попадает.
      const sdk = await import("@telegram-apps/sdk");
      if (cancelled) return;

      // Не Telegram-окружение (обычный браузер в dev) — молча выходим.
      try {
        if (!sdk.isTMA()) return;
      } catch {
        return;
      }

      try {
        sdk.init();
      } catch (error) {
        console.warn("[telegram-init] sdk.init failed", error);
        return;
      }

      // Тема: mount*Sync берут данные из launch params синхронно.
      try {
        sdk.mountThemeParamsSync();
      } catch {
        /* тема останется светлой по умолчанию */
      }
      try {
        sdk.mountMiniAppSync();
      } catch {
        /* см. выше */
      }
      try {
        applyTheme(sdk.isMiniAppDark());
        unsubTheme = sdk.isMiniAppDark.sub((isDark) => applyTheme(isDark));
      } catch {
        /* сигнал темы недоступен — не критично */
      }

      // ready + expand: сообщаем Telegram, что интерфейс готов, и
      // разворачиваем webview на всю высоту.
      try {
        if (sdk.miniAppReady.isAvailable()) sdk.miniAppReady();
      } catch {
        /* no-op */
      }
      try {
        if (sdk.expandViewport.isAvailable()) sdk.expandViewport();
      } catch {
        /* no-op */
      }

      // Сессия: initDataRaw доступен всё время жизни WebApp.
      let initDataRaw: string | undefined;
      try {
        initDataRaw = sdk.retrieveRawInitData();
      } catch {
        initDataRaw = undefined;
      }
      if (initDataRaw && !cancelled) {
        const authed = await postInitData(initDataRaw);
        // RSC-рендер первого захода прошёл без сессии — обновляем, чтобы
        // серверные части (ссылка «Админка», имя в чекауте) её увидели.
        if (authed && !cancelled) router.refresh();
      }
    })();

    return () => {
      cancelled = true;
      unsubTheme?.();
    };
  }, []);

  return null;
}
