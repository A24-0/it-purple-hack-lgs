import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { Scenario, UserProgress, Achievement } from '../types';
import type { AiChatMessage, LeaderboardEntry } from '../api/endpoints';
import {
  scenariosApi,
  progressApi,
  leaderboardApi,
  aiApi,
  achievementsApi,
  authApi,
  gamesApi,
  usersApi,
} from '../api/endpoints';
import type { UserMeResponse } from '../api/endpoints';
import { apiClient } from '../api/client';
import { isTelegramWebApp, getTelegramInitData } from '../api/telegram';

const EMPTY_PROGRESS: UserProgress = {
  xp: 0,
  coins: 0,
  todayXp: 0,
  level: 1,
  streak: 0,
  totalAnswers: 0,
  correctAnswers: 0,
  completedScenarioIds: [],
};

export interface AppUser {
  id: string;
  name: string;
  email: string;
  telegramLinked?: boolean;
  avatarUrl?: string | null;
  profilePhotos?: string[] | null;
}

function mapUserFromApi(u: UserMeResponse): AppUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    telegramLinked: !!u.telegram_linked,
    avatarUrl: u.avatar_url ?? null,
    profilePhotos: u.profile_photos ?? null,
  };
}

interface AppState {
  bootstrapped: boolean;
  user: AppUser | null;
  isAuthenticated: boolean;
  scenarios: Scenario[];
  scenariosLoading: boolean;
  progress: UserProgress;
  progressLoading: boolean;
  chatMessages: AiChatMessage[];
  chatLoading: boolean;
  suggestions: string[];
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  achievements: Achievement[];
  error: string | null;
}

const initialState: AppState = {
  bootstrapped: false,
  user: null,
  isAuthenticated: false,
  scenarios: [],
  scenariosLoading: false,
  progress: EMPTY_PROGRESS,
  progressLoading: false,
  chatMessages: [],
  chatLoading: false,
  suggestions: [
    'Что такое франшиза?',
    'Как работает КАСКО?',
    'Что такое страховой случай?',
    'Зачем нужно ОСАГО?',
  ],
  leaderboard: [],
  leaderboardLoading: false,
  achievements: [],
  error: null,
};

type Action =
  | { type: 'SET_BOOTSTRAPPED'; payload: boolean }
  | { type: 'SET_USER'; payload: AppUser | null }
  | { type: 'LOGOUT' }
  | { type: 'SET_SCENARIOS'; payload: Scenario[] }
  | { type: 'SET_SCENARIOS_LOADING'; payload: boolean }
  | { type: 'SET_PROGRESS'; payload: UserProgress }
  | { type: 'SET_PROGRESS_LOADING'; payload: boolean }
  | { type: 'ADD_CHAT_MESSAGE'; payload: AiChatMessage }
  | { type: 'SET_CHAT_LOADING'; payload: boolean }
  | { type: 'SET_SUGGESTIONS'; payload: string[] }
  | { type: 'SET_LEADERBOARD'; payload: LeaderboardEntry[] }
  | { type: 'SET_LEADERBOARD_LOADING'; payload: boolean }
  | { type: 'SET_ACHIEVEMENTS'; payload: Achievement[] }
  | { type: 'EARN_REWARD'; payload: { xp: number; coins: number } }
  | { type: 'COMPLETE_SCENARIO'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_BOOTSTRAPPED':
      return { ...state, bootstrapped: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        scenarios: [],
        progress: EMPTY_PROGRESS,
        achievements: [],
        chatMessages: [],
        leaderboard: [],
      };
    case 'SET_SCENARIOS':
      return { ...state, scenarios: action.payload };
    case 'SET_SCENARIOS_LOADING':
      return { ...state, scenariosLoading: action.payload };
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    case 'SET_PROGRESS_LOADING':
      return { ...state, progressLoading: action.payload };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'SET_CHAT_LOADING':
      return { ...state, chatLoading: action.payload };
    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };
    case 'SET_LEADERBOARD':
      return { ...state, leaderboard: action.payload };
    case 'SET_LEADERBOARD_LOADING':
      return { ...state, leaderboardLoading: action.payload };
    case 'SET_ACHIEVEMENTS':
      return { ...state, achievements: action.payload };
    case 'EARN_REWARD':
      return {
        ...state,
        progress: {
          ...state.progress,
          xp: state.progress.xp + action.payload.xp,
          coins: state.progress.coins + action.payload.coins,
          todayXp: state.progress.todayXp + action.payload.xp,
        },
      };
    case 'COMPLETE_SCENARIO':
      return {
        ...state,
        progress: {
          ...state.progress,
          completedScenarioIds: state.progress.completedScenarioIds.includes(action.payload)
            ? state.progress.completedScenarioIds
            : [...state.progress.completedScenarioIds, action.payload],
        },
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  actions: {
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    loadScenarios: () => Promise<void>;
    loadProgress: () => Promise<void>;
    loadLeaderboard: (period?: string) => Promise<void>;
    loadAchievements: () => Promise<void>;
    sendChatMessage: (text: string, context?: string) => Promise<void>;
    getHint: (scenarioId: string, stepId: string) => Promise<string>;
    earnReward: (xp: number, coins: number) => Promise<void>;
    completeScenario: (scenarioId: string) => void;
    saveGameResult: (gameType: string, score: number, metadata?: Record<string, unknown>) => Promise<void>;
    clearError: () => void;
    refreshSessionData: () => Promise<void>;
    linkTelegram: () => Promise<void>;
    generateLinkCode: () => Promise<{ code: string; expires_in: number }>;
    updateProfile: (payload: { name?: string; email?: string }) => Promise<void>;
    refreshUser: () => Promise<void>;
  };
}

const AppContext = createContext<AppContextType | null>(null);

type LoadSessionOpts = { skipUserFetch?: boolean };

/** Один запрос профиля; при ошибке сбрасывает сессию. */
async function fetchUserOrLogout(dispatch: React.Dispatch<Action>): Promise<boolean> {
  if (!apiClient.isAuthenticated()) return false;
  try {
    const me = await authApi.me();
    dispatch({ type: 'SET_USER', payload: mapUserFromApi(me) });
    return true;
  } catch {
    apiClient.clearToken();
    dispatch({ type: 'LOGOUT' });
    return false;
  }
}

/**
 * Сценарии и прогресс — сразу (нужны главной). Достижения и подсказки — после,
 * чтобы интерфейс открылся после одного round-trip к /me и пары запросов данных.
 */
async function loadSessionData(dispatch: React.Dispatch<Action>, opts?: LoadSessionOpts) {
  if (!apiClient.isAuthenticated()) {
    dispatch({ type: 'SET_SCENARIOS_LOADING', payload: false });
    dispatch({ type: 'SET_PROGRESS_LOADING', payload: false });
    return;
  }
  dispatch({ type: 'SET_SCENARIOS_LOADING', payload: true });
  dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
  try {
    if (!opts?.skipUserFetch) {
      const ok = await fetchUserOrLogout(dispatch);
      if (!ok) return;
    }
    const [scR, prR] = await Promise.allSettled([
      scenariosApi.getAll(),
      progressApi.get(),
    ]);
    const failed: string[] = [];
    if (scR.status === 'fulfilled') {
      dispatch({ type: 'SET_SCENARIOS', payload: scR.value });
    } else {
      failed.push('сценарии');
    }
    if (prR.status === 'fulfilled') {
      dispatch({ type: 'SET_PROGRESS', payload: prR.value });
    } else {
      failed.push('прогресс');
    }
    if (failed.length) {
      dispatch({
        type: 'SET_ERROR',
        payload: `Не удалось загрузить: ${failed.join(', ')}. Проверь сеть и обнови страницу.`,
      });
    }
  } catch (e) {
    dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
  } finally {
    dispatch({ type: 'SET_SCENARIOS_LOADING', payload: false });
    dispatch({ type: 'SET_PROGRESS_LOADING', payload: false });
  }

  void (async () => {
    if (!apiClient.isAuthenticated()) return;
    const [achR, sugR] = await Promise.allSettled([
      achievementsApi.getAll(),
      aiApi.getSuggestions(),
    ]);
    if (achR.status === 'fulfilled') {
      dispatch({ type: 'SET_ACHIEVEMENTS', payload: achR.value });
    }
    if (sugR.status === 'fulfilled' && sugR.value?.length) {
      dispatch({ type: 'SET_SUGGESTIONS', payload: sugR.value });
    }
  })();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const chatMessagesRef = useRef(state.chatMessages);
  chatMessagesRef.current = state.chatMessages;

  const refreshSessionData = useCallback(async () => {
    await loadSessionData(dispatchRef.current);
  }, []);

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible' && apiClient.isAuthenticated()) {
        void loadSessionData(dispatchRef.current, { skipUserFetch: true });
      }
    };
    const onOnline = () => {
      if (apiClient.isAuthenticated()) void loadSessionData(dispatchRef.current, { skipUserFetch: true });
    };
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    let dead = false;
    let settled = false;
    const BOOTSTRAP_TIMEOUT_MS = 20000;

    const timer = setTimeout(() => {
      if (dead || settled) return;
      settled = true;
      apiClient.clearToken();
      dispatch({ type: 'LOGOUT' });
      dispatch({
        type: 'SET_ERROR',
        payload: `Сервер не отвечает вовремя. Проверь, что API запущен (порт ${import.meta.env.VITE_DEV_API_PORT || '8000'}), сеть и попробуй обновить страницу.`,
      });
      dispatch({ type: 'SET_BOOTSTRAPPED', payload: true });
    }, BOOTSTRAP_TIMEOUT_MS);

    const finishBootstrap = () => {
      if (dead || settled) return;
      settled = true;
      clearTimeout(timer);
      dispatch({ type: 'SET_BOOTSTRAPPED', payload: true });
    };

    (async () => {
      const tgInit = isTelegramWebApp() ? getTelegramInitData() : null;
      if (tgInit) {
        try {
          const res = await authApi.telegramAuth(tgInit);
          if (dead) return;
          apiClient.setToken(res.access_token);
          const ok = await fetchUserOrLogout(dispatch);
          if (dead) return;
          finishBootstrap();
          if (ok) void loadSessionData(dispatch, { skipUserFetch: true });
        } catch {
          dispatch({
            type: 'SET_ERROR',
            payload: 'Не удалось войти через Telegram. Войди по email на сайте.',
          });
          finishBootstrap();
        }
        return;
      }

      if (!apiClient.isAuthenticated()) {
        finishBootstrap();
        return;
      }
      if (dead) return;
      const ok = await fetchUserOrLogout(dispatch);
      if (dead) return;
      finishBootstrap();
      if (ok) void loadSessionData(dispatch, { skipUserFetch: true });
    })();

    return () => {
      dead = true;
      clearTimeout(timer);
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    dispatch({ type: 'SET_USER', payload: mapUserFromApi(me) });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    apiClient.setToken(res.token);
    await loadSessionData(dispatch);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await authApi.register(name, email, password);
    apiClient.setToken(res.token);
    await loadSessionData(dispatch);
  }, []);

  const linkTelegram = useCallback(async () => {
    const initData = getTelegramInitData();
    if (!initData) {
      dispatch({ type: 'SET_ERROR', payload: 'Открыть Telegram Mini App и повторить привязку' });
      return;
    }
    await authApi.linkTelegram(initData);
    await loadSessionData(dispatch);
  }, []);

  const generateLinkCode = useCallback(async () => {
    return authApi.generateLinkCode();
  }, []);

  const updateProfile = useCallback(async (payload: { name?: string; email?: string }) => {
    const user = await usersApi.updateProfile(payload);
    dispatch({ type: 'SET_USER', payload: mapUserFromApi(user) });
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const loadScenarios = useCallback(async () => {
    dispatch({ type: 'SET_SCENARIOS_LOADING', payload: true });
    try {
      const data = await scenariosApi.getAll();
      dispatch({ type: 'SET_SCENARIOS', payload: data });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    } finally {
      dispatch({ type: 'SET_SCENARIOS_LOADING', payload: false });
    }
  }, []);

  const loadProgress = useCallback(async () => {
    dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
    try {
      const data = await progressApi.get();
      dispatch({ type: 'SET_PROGRESS', payload: data });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    } finally {
      dispatch({ type: 'SET_PROGRESS_LOADING', payload: false });
    }
  }, []);

  const loadLeaderboard = useCallback(async (period?: string) => {
    dispatch({ type: 'SET_LEADERBOARD_LOADING', payload: true });
    try {
      const data = await leaderboardApi.getTop(20, period);
      dispatch({ type: 'SET_LEADERBOARD', payload: data });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    } finally {
      dispatch({ type: 'SET_LEADERBOARD_LOADING', payload: false });
    }
  }, []);

  const loadAchievements = useCallback(async () => {
    try {
      const data = await achievementsApi.getAll();
      dispatch({ type: 'SET_ACHIEVEMENTS', payload: data });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    }
  }, []);

  const sendChatMessage = useCallback(async (text: string, context?: string) => {
    const userMsg: AiChatMessage = {
      id: `${Date.now()}-u`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_CHAT_LOADING', payload: true });

    try {
      const history = [...chatMessagesRef.current, userMsg].map((m) => ({
        role: m.role,
        content: m.text,
      }));
      const aiMsg = await aiApi.sendMessage(history, context);
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: aiMsg });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    } finally {
      dispatch({ type: 'SET_CHAT_LOADING', payload: false });
    }
  }, []);

  const getHint = useCallback(async (scenarioId: string, stepId: string): Promise<string> => {
    const res = await aiApi.getHint(scenarioId, stepId);
    return res.hint;
  }, []);

  const earnReward = useCallback(async (xp: number, coins: number) => {
    dispatch({ type: 'EARN_REWARD', payload: { xp, coins } });
    try {
      await progressApi.addReward(xp, coins);
      await loadSessionData(dispatch, { skipUserFetch: true });
    } catch {
      try {
        await loadSessionData(dispatch, { skipUserFetch: true });
      } catch {
        /* ignore */
      }
    }
  }, []);

  const completeScenario = useCallback((scenarioId: string) => {
    dispatch({ type: 'COMPLETE_SCENARIO', payload: scenarioId });
  }, []);

  const saveGameResult = useCallback(async (gameType: string, score: number, metadata?: Record<string, unknown>) => {
    try {
      await gamesApi.saveResult(gameType, score, metadata);
      await loadSessionData(dispatch, { skipUserFetch: true });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        actions: {
          login,
          register,
          logout,
          loadScenarios,
          loadProgress,
          loadLeaderboard,
          loadAchievements,
          sendChatMessage,
          getHint,
          earnReward,
          completeScenario,
          saveGameResult,
          clearError,
          refreshSessionData,
          linkTelegram,
          generateLinkCode,
          updateProfile,
          refreshUser,
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
