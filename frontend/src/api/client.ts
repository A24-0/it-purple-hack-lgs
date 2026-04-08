function resolveBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return 'http://127.0.0.1:8000';
}

const BASE_URL = import.meta.env.DEV ? '' : resolveBaseUrl();

async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { detail?: string | string[] };
    if (typeof j.detail === 'string') return j.detail;
    if (Array.isArray(j.detail)) return j.detail.map((d) => (typeof d === 'string' ? d : JSON.stringify(d))).join(', ');
  } catch {}
  return text || res.statusText || `Ошибка ${res.status}`;
}

function wrapNetworkError(e: unknown): Error {
  if (e instanceof TypeError && String(e.message).toLowerCase().includes('fetch')) {
    return new Error(
      'Нет связи с сервером. Убедись, что API запущен на порту 8000 (docker compose в backend/ или uvicorn).'
    );
  }
  return e instanceof Error ? e : new Error(String(e));
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async get<T>(path: string): Promise<T> {
    try {
      const res = await fetch(`${BASE_URL}${path}`, { headers: this.headers() });
      if (!res.ok) throw new Error(await readApiError(res));
      return res.json();
    } catch (e) {
      throw wrapNetworkError(e);
    }
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(await readApiError(res));
      return res.json();
    } catch (e) {
      throw wrapNetworkError(e);
    }
  }
}

export const apiClient = new ApiClient();
