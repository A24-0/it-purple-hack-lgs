import { apiClient } from './client';
import type { Scenario, UserProgress, Achievement, DictionaryTerm } from '../types';

interface WebAuthResponse {
  access_token: string;
  user: { id: string; name: string; email: string; telegram_linked?: boolean };
}

interface TokenResponse {
  access_token: string;
  user_id: number;
  username: string | null;
  first_name: string | null;
}

interface ProgressDTO {
  xp: number;
  coins: number;
  today_xp: number;
  level: number;
  streak: number;
  total_answers: number;
  correct_answers: number;
  completed_scenario_ids: string[];
}

interface ApiScenarioRow {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: number;
  xp_reward: number;
  icon?: string;
}

export interface ScenarioStartResponse {
  progress_id: number;
  scenario_id: number;
  step: {
    id: number;
    order: number;
    prompt: string;
    choices: { text: string; is_correct?: boolean; feedback?: string }[] | null;
  };
  total_steps: number;
}

export interface ScenarioAnswerResponse {
  correct: boolean;
  feedback: string | null;
  xp_earned: number;
  completed: boolean;
  next_step: ScenarioStartResponse['step'] | null;
}

interface LeaderboardApiRow {
  rank: number;
  user_id: number;
  username: string | null;
  first_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  streak_days: number;
  scenarios_completed: number;
}

function mapProgress(r: ProgressDTO): UserProgress {
  return {
    xp: r.xp,
    coins: r.coins,
    todayXp: r.today_xp,
    level: r.level,
    streak: r.streak,
    totalAnswers: r.total_answers,
    correctAnswers: r.correct_answers,
    completedScenarioIds: r.completed_scenario_ids,
  };
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post<WebAuthResponse>('/api/auth/login', { email, password });
    return { token: res.access_token, user: res.user };
  },

  register: async (name: string, email: string, password: string) => {
    const res = await apiClient.post<WebAuthResponse>('/api/auth/register', {
      name,
      email,
      password,
    });
    return { token: res.access_token, user: res.user };
  },

  me: () => apiClient.get<{ id: string; name: string; email: string; telegram_linked?: boolean }>('/api/auth/me'),

  telegramAuth: (initData: string) =>
    apiClient.post<TokenResponse>('/api/auth/telegram', { init_data: initData }),

  linkTelegram: (initData: string) =>
    apiClient.post<{ id: string; name: string; email: string; telegram_linked?: boolean }>('/api/auth/link-telegram', {
      init_data: initData,
    }),

  generateLinkCode: () =>
    apiClient.post<{ code: string; expires_in: number }>('/api/auth/link-code/generate', {}),

  logout: () => {
    apiClient.clearToken();
  },
};

export const usersApi = {
  updateProfile: (name: string) =>
    apiClient.patch<{ id: string; name: string; email: string; telegram_linked: boolean }>('/api/users/me', { name }),
};

export const scenariosApi = {
  getAll: async (): Promise<Scenario[]> => {
    const rows = await apiClient.get<ApiScenarioRow[]>('/api/scenarios');
    return rows.map((s) => ({
      id: String(s.id),
      title: s.title,
      description: s.description || '',
      icon: s.icon || 'SC',
      maxXp: s.xp_reward,
      category: s.category || undefined,
      steps: [],
    }));
  },

  getById: (id: string) => apiClient.get<Scenario>(`/api/scenarios/${id}`),

  start: (scenarioId: number) =>
    apiClient.post<ScenarioStartResponse>('/api/scenarios/start', { scenario_id: scenarioId }),

  answer: (progressId: number, answer: string) =>
    apiClient.post<ScenarioAnswerResponse>('/api/scenarios/answer', {
      progress_id: progressId,
      answer,
    }),

  submitChoice: (scenarioId: string, stepId: string, choiceId: string) =>
    apiClient.post<{ xpEarned: number; coinsEarned: number }>(
      `/api/scenarios/${scenarioId}/choice`,
      { stepId, choiceId }
    ),

  complete: (scenarioId: string, data: { xpEarned: number; coinsEarned: number }) =>
    apiClient.post<void>(`/api/scenarios/${scenarioId}/complete`, data),
};

export const progressApi = {
  get: async () => {
    const r = await apiClient.get<ProgressDTO>('/api/progress');
    return mapProgress(r);
  },

  addReward: (xp: number, coins: number) =>
    apiClient.post<{ ok: boolean }>('/api/progress/reward', { xp, coins }),
};

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  level: number;
  completedScenarios: number;
}

export const leaderboardApi = {
  getTop: async (limit = 20, _period?: string) => {
    const res = await apiClient.get<{ entries: LeaderboardApiRow[]; my_rank: number | null }>(
      `/api/leaderboard?limit=${limit}`
    );
    return res.entries.map((e) => ({
      rank: e.rank,
      userId: String(e.user_id),
      name: e.first_name || e.username || 'Игрок',
      xp: e.total_xp,
      level: Math.max(1, 1 + Math.floor(e.total_xp / 200)),
      completedScenarios: e.scenarios_completed,
    }));
  },
};

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface DailyQuizQuestion {
  id: number;
  order: number;
  text: string;
  options: string[];
}

export interface DailyQuiz {
  id: number;
  title: string;
  xp_reward: number;
  questions: DailyQuizQuestion[];
}

export interface DailyQuizAnswerResult {
  question_id: number;
  correct: boolean;
  correct_index: number;
}

export interface DailyQuizAnswerResponse {
  quiz_id: number;
  correct_count: number;
  total_questions: number;
  xp_earned: number;
  results: DailyQuizAnswerResult[];
}

export const aiApi = {
  sendMessage: async (
    messages: { role: string; content: string }[],
    context?: string
  ): Promise<AiChatMessage> => {
    const res = await apiClient.post<{ reply: string; model?: string }>('/api/ai/chat', {
      messages,
      context,
    });
    return {
      id: `${Date.now()}-a`,
      role: 'assistant',
      text: res.reply,
      timestamp: new Date().toISOString(),
    };
  },

  getHint: (scenarioId: string, stepId: string) =>
    apiClient.post<{ hint: string }>('/api/ai/hint', { scenarioId, stepId }),

  getSuggestions: () => apiClient.get<string[]>('/api/ai/suggestions'),
};

export const achievementsApi = {
  getAll: () => apiClient.get<Achievement[]>('/api/achievements'),
};

export const gamesApi = {
  saveResult: (gameType: string, score: number, metadata?: Record<string, unknown>) =>
    apiClient.post<{ game_id: number; xp_earned: number; total_xp: number }>('/api/games/save', {
      game_type: gameType,
      score,
      metadata: metadata ?? null,
    }),
  getTopByType: (gameType: string, limit = 8) =>
    apiClient.get<{
      game_type: string;
      entries: { rank: number; user_id: number; username: string | null; first_name: string | null; best_score: number }[];
    }>(`/api/games/top?game_type=${encodeURIComponent(gameType)}&limit=${limit}`),
};

export const quizzesApi = {
  getDaily: () => apiClient.get<DailyQuiz>('/api/quizzes/daily'),
  answerDaily: (quizId: number, answers: { question_id: number; selected_index: number }[]) =>
    apiClient.post<DailyQuizAnswerResponse>('/api/quizzes/answer', {
      quiz_id: quizId,
      answers,
    }),
};

export const dictionaryApi = {
  getTerms: () => apiClient.get<DictionaryTerm[]>('/api/dictionary/terms'),
};
