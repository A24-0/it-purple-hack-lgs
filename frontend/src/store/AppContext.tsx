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
} from '../api/endpoints';
import { apiClient } from '../api/client';
import { isTelegramWebApp, getTelegramInitData } from '../api/telegram';

const EMPTY_PROGRESS: UserProgress = {
  xp: 0,
  coins: 0,
  todayXp: 0,
  level: 1,
  streak: 0,
  totalAnswers: 1,
  correctAnswers: 0,
  completedScenarioIds: [],
};

interface AppState {
  bootstrapped: boolean;
  user: { id: string; name: string; email: string; telegramLinked?: boolean } | null;
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
  | { type: 'SET_USER'; payload: AppState['user'] }
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
    earnReward: (xp: number, coins: number) => void;
    completeScenario: (scenarioId: string) => void;
    saveGameResult: (gameType: string, score: number, metadata?: Record<string, unknown>) => Promise<void>;
    clearError: () => void;
    refreshSessionData: () => Promise<void>;
    linkTelegram: () => Promise<void>;
  };
}

const AppContext = createContext<AppContextType | null>(null);

async function loadSessionData(dispatch: React.Dispatch<Action>) {
  dispatch({ type: 'SET_SCENARIOS_LOADING', payload: true });
  dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
  try {
    const [sc, pr, ach, sug] = await Promise.all([
      scenariosApi.getAll(),
      progressApi.get(),
      achievementsApi.getAll().catch(() => [] as Achievement[]),
      aiApi.getSuggestions().catch(() => null),
    ]);
    dispatch({ type: 'SET_SCENARIOS', payload: sc });
    dispatch({ type: 'SET_PROGRESS', payload: pr });
    dispatch({ type: 'SET_ACHIEVEMENTS', payload: ach });
    if (sug?.length) dispatch({ type: 'SET_SUGGESTIONS', payload: sug });
  } catch (e) {
    dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
  } finally {
    dispatch({ type: 'SET_SCENARIOS_LOADING', payload: false });
    dispatch({ type: 'SET_PROGRESS_LOADING', payload: false });
  }
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
    let dead = false;
    (async () => {
      const tgInit = isTelegramWebApp() ? getTelegramInitData() : null;
      if (tgInit) {
        try {
          const res = await authApi.telegramAuth(tgInit);
          if (dead) return;
          apiClient.setToken(res.access_token);
          const me = await authApi.me();
          dispatch({ type: 'SET_USER', payload: mapUser(me) });
          await loadSessionData(dispatch);
        } catch {
          dispatch({
            type: 'SET_ERROR',
            payload: 'Не удалось войти через Telegram. Войди по email на сайте.',
          });
        } finally {
          if (!dead) dispatch({ type: 'SET_BOOTSTRAPPED', payload: true });
        }
        return;
      }

      if (!apiClient.isAuthenticated()) {
        if (!dead) dispatch({ type: 'SET_BOOTSTRAPPED', payload: true });
        return;
      }
      try {
        const me = await authApi.me();
        if (dead) return;
        dispatch({ type: 'SET_USER', payload: mapUser(me) });
        await loadSessionData(dispatch);
      } catch {
        apiClient.clearToken();
        dispatch({ type: 'LOGOUT' });
      } finally {
        if (!dead) dispatch({ type: 'SET_BOOTSTRAPPED', payload: true });
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  const mapUser = (u: { id: string; name: string; email: string; telegram_linked?: boolean }) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    telegramLinked: !!u.telegram_linked,
  });

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    apiClient.setToken(res.token);
    dispatch({ type: 'SET_USER', payload: mapUser(res.user) });
    await loadSessionData(dispatch);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await authApi.register(name, email, password);
    apiClient.setToken(res.token);
    dispatch({ type: 'SET_USER', payload: mapUser(res.user) });
    await loadSessionData(dispatch);
  }, []);

  const linkTelegram = useCallback(async () => {
    const initData = getTelegramInitData();
    if (!initData) {
      dispatch({ type: 'SET_ERROR', payload: 'Открыть Telegram Mini App и повторить привязку' });
      return;
    }
    const user = await authApi.linkTelegram(initData);
    dispatch({ type: 'SET_USER', payload: mapUser(user) });
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

  const earnReward = useCallback((xp: number, coins: number) => {
    dispatch({ type: 'EARN_REWARD', payload: { xp, coins } });
    progressApi.addReward(xp, coins).catch(() => {});
  }, []);

  const completeScenario = useCallback((scenarioId: string) => {
    dispatch({ type: 'COMPLETE_SCENARIO', payload: scenarioId });
  }, []);

  const saveGameResult = useCallback(async (gameType: string, score: number, metadata?: Record<string, unknown>) => {
    try {
      await gamesApi.saveResult(gameType, score, metadata);
      await loadProgress();
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    }
  }, [loadProgress]);

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
