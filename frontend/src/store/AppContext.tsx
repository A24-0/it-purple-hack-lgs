import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { Scenario, UserProgress, Achievement } from '../types';
import type { AiChatMessage, LeaderboardEntry } from '../api/endpoints';
import {
  scenarios as mockScenarios,
  userProgress as mockProgress,
  achievements as mockAchievements,
} from '../data/mockData';
import { scenariosApi, progressApi, leaderboardApi, aiApi, achievementsApi, authApi, gamesApi } from '../api/endpoints';
import { apiClient } from '../api/client';
import { isTelegramWebApp, getTelegramInitData, getTelegramUser } from '../api/telegram';

interface AppState {
  user: { id: string; name: string; email: string } | null;
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
  useMockData: boolean;
}

const initialState: AppState = {
  user: null,
  isAuthenticated: apiClient.isAuthenticated(),
  scenarios: mockScenarios,
  scenariosLoading: false,
  progress: mockProgress,
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
  achievements: mockAchievements,
  error: null,
  useMockData: true,
};

type Action =
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
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MOCK_MODE'; payload: boolean };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };
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
    case 'SET_MOCK_MODE':
      return { ...state, useMockData: action.payload };
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
    saveGameResult: (gameType: string, score: number, xp: number, coins: number) => void;
    clearError: () => void;
  };
}

const AppContext = createContext<AppContextType | null>(null);

const mockAiResponses: Record<string, string> = {
  'франшиза': 'Франшиза — это часть убытка, которую ты оплачиваешь сам. Например, если франшиза 1000 руб., а ущерб 5000 руб., страховая заплатит 4000 руб. Бывает условная (если убыток больше франшизы — платят всё) и безусловная (всегда вычитают).',
  'каско': 'КАСКО — добровольное страхование автомобиля. Покрывает повреждения, угон, стихийные бедствия. В отличие от ОСАГО, защищает именно твою машину, а не чужую.',
  'осаго': 'ОСАГО — обязательное страхование автогражданской ответственности. Если ты виноват в ДТП, ОСАГО оплатит ремонт чужой машины. Без ОСАГО нельзя ездить по закону!',
  'страховой случай': 'Страховой случай — это событие, при котором страховая обязана заплатить. Оно должно быть предусмотрено в договоре. Например: поломка телефона, если он застрахован от повреждений.',
  'полис': 'Страховой полис — документ, подтверждающий твою страховку. В нём указано: что застраховано, на какую сумму, от каких рисков и на какой срок.',
  'премия': 'Страховая премия — это плата за страховку. Ты платишь её страховой компании, а взамен получаешь защиту. Чем больше рисков покрываешь — тем выше премия.',
};

function getMockAiResponse(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, response] of Object.entries(mockAiResponses)) {
    if (lower.includes(key)) return response;
  }
  return 'Страхование — это способ защитить себя от финансовых потерь. Ты платишь небольшую сумму (премию), а если случится что-то плохое (страховой случай) — страховая компания компенсирует убытки. Задай мне конкретный вопрос о страховании!';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    if (isTelegramWebApp()) {
      const initData = getTelegramInitData();
      const tgUser = getTelegramUser();
      if (initData && tgUser) {
        apiClient
          .post<{ token: string; user: { id: string; name: string; email: string } }>(
            '/api/auth/telegram',
            { init_data: initData }
          )
          .then((res) => {
            apiClient.setToken(res.token);
            dispatch({ type: 'SET_USER', payload: res.user });
            dispatch({ type: 'SET_MOCK_MODE', payload: false });
          })
          .catch(() => {
            dispatch({
              type: 'SET_USER',
              payload: {
                id: String(tgUser.id),
                name: tgUser.first_name,
                email: '',
              },
            });
          });
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      if (state.useMockData) {
        dispatch({ type: 'SET_USER', payload: { id: '1', name: 'Артём', email } });
        return;
      }
      const res = await authApi.login(email, password);
      apiClient.setToken(res.token);
      dispatch({ type: 'SET_USER', payload: res.user });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
      throw e;
    }
  }, [state.useMockData]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      if (state.useMockData) {
        dispatch({ type: 'SET_USER', payload: { id: '1', name, email } });
        return;
      }
      const res = await authApi.register(name, email, password);
      apiClient.setToken(res.token);
      dispatch({ type: 'SET_USER', payload: res.user });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
      throw e;
    }
  }, [state.useMockData]);

  const logout = useCallback(() => {
    authApi.logout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const loadScenarios = useCallback(async () => {
    if (state.useMockData) return;
    dispatch({ type: 'SET_SCENARIOS_LOADING', payload: true });
    try {
      const data = await scenariosApi.getAll();
      dispatch({ type: 'SET_SCENARIOS', payload: data });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    } finally {
      dispatch({ type: 'SET_SCENARIOS_LOADING', payload: false });
    }
  }, [state.useMockData]);

  const loadProgress = useCallback(async () => {
    if (state.useMockData) return;
    dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
    try {
      const data = await progressApi.get();
      dispatch({ type: 'SET_PROGRESS', payload: data });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    } finally {
      dispatch({ type: 'SET_PROGRESS_LOADING', payload: false });
    }
  }, [state.useMockData]);

  const loadLeaderboard = useCallback(async (period?: string) => {
    if (state.useMockData) {
      dispatch({
        type: 'SET_LEADERBOARD',
        payload: [
          { rank: 1, userId: '1', name: 'Артём', xp: 1240, level: 8, completedScenarios: 4 },
          { rank: 2, userId: '2', name: 'Мария', xp: 980, level: 6, completedScenarios: 3 },
          { rank: 3, userId: '3', name: 'Дмитрий', xp: 870, level: 5, completedScenarios: 3 },
          { rank: 4, userId: '4', name: 'Анна', xp: 650, level: 4, completedScenarios: 2 },
          { rank: 5, userId: '5', name: 'Иван', xp: 420, level: 3, completedScenarios: 2 },
          { rank: 6, userId: '6', name: 'Елена', xp: 310, level: 2, completedScenarios: 1 },
          { rank: 7, userId: '7', name: 'Павел', xp: 180, level: 1, completedScenarios: 1 },
          { rank: 8, userId: '8', name: 'Ольга', xp: 90, level: 1, completedScenarios: 0 },
        ],
      });
      return;
    }
    dispatch({ type: 'SET_LEADERBOARD_LOADING', payload: true });
    try {
      const data = await leaderboardApi.getTop(20, period);
      dispatch({ type: 'SET_LEADERBOARD', payload: data });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    } finally {
      dispatch({ type: 'SET_LEADERBOARD_LOADING', payload: false });
    }
  }, [state.useMockData]);

  const loadAchievements = useCallback(async () => {
    if (state.useMockData) return;
    try {
      const data = await achievementsApi.getAll();
      dispatch({ type: 'SET_ACHIEVEMENTS', payload: data });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    }
  }, [state.useMockData]);

  const sendChatMessage = useCallback(async (text: string, context?: string) => {
    const userMsg: AiChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_CHAT_LOADING', payload: true });

    try {
      if (state.useMockData) {
        await new Promise((r) => setTimeout(r, 800));
        const aiMsg: AiChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: getMockAiResponse(text),
          timestamp: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: aiMsg });
      } else {
        const aiMsg = await aiApi.sendMessage(text, context);
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: aiMsg });
      }
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: (e as Error).message });
    } finally {
      dispatch({ type: 'SET_CHAT_LOADING', payload: false });
    }
  }, [state.useMockData]);

  const getHint = useCallback(async (scenarioId: string, stepId: string): Promise<string> => {
    if (state.useMockData) {
      await new Promise((r) => setTimeout(r, 600));
      const scenario = state.scenarios.find((s) => s.id === scenarioId);
      const step = scenario?.steps.find((s) => s.id === stepId);
      const optimal = step?.choices.find((c) => c.isOptimal);
      if (optimal) {
        return `Подсказка: обрати внимание на вариант, связанный с ${optimal.text.toLowerCase().slice(0, 40)}... Подумай, какое действие наиболее ответственное и практичное.`;
      }
      return 'Подсказка: подумай, какой вариант лучше защитит тебя финансово. Страхование — это про предусмотрительность!';
    }
    const res = await aiApi.getHint(scenarioId, stepId);
    return res.hint;
  }, [state.useMockData, state.scenarios]);

  const earnReward = useCallback((xp: number, coins: number) => {
    dispatch({ type: 'EARN_REWARD', payload: { xp, coins } });
    if (!state.useMockData) {
      progressApi.addReward(xp, coins).catch(() => {});
    }
  }, [state.useMockData]);

  const completeScenario = useCallback((scenarioId: string) => {
    dispatch({ type: 'COMPLETE_SCENARIO', payload: scenarioId });
  }, []);

  const saveGameResult = useCallback((gameType: string, score: number, xp: number, coins: number) => {
    if (!state.useMockData) {
      gamesApi.saveResult({ gameType, score, xpEarned: xp, coinsEarned: coins }).catch(() => {});
    }
  }, [state.useMockData]);

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
