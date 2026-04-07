declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
          auth_date: number;
          hash: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          setParams: (params: { text?: string; color?: string; text_color?: string }) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        colorScheme: 'light' | 'dark';
        platform: string;
        version: string;
        isExpanded: boolean;
        switchInlineQuery: (query: string, chatTypes?: string[]) => void;
      };
    };
  }
}

export function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null;
}

export function isTelegramWebApp(): boolean {
  return !!window.Telegram?.WebApp?.initData;
}

export function getTelegramInitData(): string {
  return window.Telegram?.WebApp?.initData ?? '';
}

export function getTelegramUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}

export function initTelegramWebApp() {
  const webapp = getTelegramWebApp();
  if (!webapp) return;

  webapp.ready();
  webapp.expand();
}

export function telegramHaptic(type: 'light' | 'medium' | 'heavy') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
  } catch { /* noop */ }
}

export function telegramShareResult(text: string) {
  try {
    window.Telegram?.WebApp?.switchInlineQuery(text, ['users', 'groups']);
  } catch {
    navigator.clipboard?.writeText(text);
  }
}
