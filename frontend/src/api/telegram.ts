declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebAppInstance;
    };
  }
}

export type TelegramWebAppInstance = {
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
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  isExpanded: boolean;
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
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
  switchInlineQuery: (query: string, chatTypes?: string[]) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
};

export function getTelegramWebApp(): TelegramWebAppInstance | null {
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

function applyTelegramTheme(webapp: TelegramWebAppInstance) {
  const tp = webapp.themeParams;
  const root = document.documentElement;
  if (tp.bg_color) {
    root.style.setProperty('--tg-bg', tp.bg_color);
    root.style.setProperty('--bg', tp.bg_color);
  }
  if (tp.secondary_bg_color) {
    root.style.setProperty('--bg-secondary', tp.secondary_bg_color);
  }
  if (tp.text_color) root.style.setProperty('--text-primary', tp.text_color);
  if (tp.hint_color) root.style.setProperty('--text-secondary', tp.hint_color);
  if (tp.button_color) {
    root.style.setProperty('--primary', tp.button_color);
    root.style.setProperty(
      '--hero-gradient',
      `linear-gradient(180deg, ${tp.button_color} 0%, ${adjustDark(tp.button_color)} 100%)`
    );
  }
  if (tp.button_text_color) root.style.setProperty('--text-white', tp.button_text_color);

  if (webapp.colorScheme === 'dark') {
    root.classList.add('tg-dark');
    document.body.classList.add('tg-webapp');
  } else {
    root.classList.remove('tg-dark');
    document.body.classList.add('tg-webapp');
  }

  const w = webapp as unknown as {
    setHeaderColor?: (c: string) => void;
    setBackgroundColor?: (c: string) => void;
    disableVerticalSwipes?: () => void;
  };
  try {
    if (tp.bg_color && w.setBackgroundColor) w.setBackgroundColor(tp.bg_color);
    if (tp.button_color && w.setHeaderColor) w.setHeaderColor(tp.button_color);
    if (typeof w.disableVerticalSwipes === 'function') w.disableVerticalSwipes();
  } catch {}
}

function adjustDark(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1, 7), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 25);
  const g = Math.max(0, ((n >> 8) & 0xff) - 25);
  const b = Math.max(0, (n & 0xff) - 25);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function initTelegramWebApp() {
  const webapp = getTelegramWebApp();
  if (!webapp) return;

  webapp.ready();
  webapp.expand();
  applyTelegramTheme(webapp);

  const onTheme = () => applyTelegramTheme(webapp);
  if (webapp.onEvent) {
    webapp.onEvent('themeChanged', onTheme);
  }

  const ext = webapp as unknown as { viewportStableHeight?: number };
  const syncViewport = () => {
    const h = ext.viewportStableHeight;
    if (h && h > 0) {
      document.documentElement.style.setProperty('--tg-viewport-stable-height', `${h}px`);
    }
  };
  syncViewport();
  if (webapp.onEvent) {
    webapp.onEvent('viewportChanged', syncViewport);
  }
}

export function telegramHaptic(type: 'light' | 'medium' | 'heavy') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
  } catch {}
}

export function telegramShareResult(text: string) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    void navigator.share({ text }).catch(() => {
      void navigator.clipboard?.writeText(text);
    });
    return;
  }
  void navigator.clipboard?.writeText(text);
}
