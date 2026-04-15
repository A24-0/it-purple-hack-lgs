const STORAGE_KEY = 'ingoskids_prefs_v1';

export type AppStoredPrefs = {
  pushNotifications: boolean;
  dailyReminder: boolean;
  soundEffects: boolean;
  language: 'ru';
};

const defaults: AppStoredPrefs = {
  pushNotifications: true,
  dailyReminder: true,
  soundEffects: true,
  language: 'ru',
};

export function loadAppPrefs(): AppStoredPrefs {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveAppPrefs(patch: Partial<AppStoredPrefs>): AppStoredPrefs {
  const next = { ...loadAppPrefs(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

/** Для игр и сценариев: включены ли звуковые эффекты (по умолчанию да). */
export function isSoundEffectsEnabled(): boolean {
  return loadAppPrefs().soundEffects;
}
