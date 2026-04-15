/** Абсолютный URL для /static/... с бэкенда (в проде VITE_API_URL). В dev — относительный путь (прокси Vite). */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  const base = fromEnv?.replace(/\/$/, '') ?? '';
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base && typeof window !== 'undefined') {
    return p;
  }
  return `${base}${p}`;
}
