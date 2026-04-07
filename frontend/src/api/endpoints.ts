import { apiClient } from './client';
import type { Scenario, UserProgress, Achievement } from '../types';

interface AuthResponse {
  token: string;
  user: { id: string; name: string; email: string };
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/register', { name, email, password }),

  me: () =>
    apiClient.get<{ id: string; name: string; email: string }>('/api/auth/me'),

  logout: () => {
    apiClient.clearToken();
  },
};

export const scenariosApi = {
  getAll: () =>
    apiClient.get<Scenario[]>('/api/scenarios'),

  getById: (id: string) =>
    apiClient.get<Scenario>(`/api/scenarios/${id}`),

  submitChoice: (scenarioId: string, stepId: string, choiceId: string) =>
    apiClient.post<{ xpEarned: number; coinsEarned: number }>(
      `/api/scenarios/${scenarioId}/choice`,
      { stepId, choiceId }
    ),

  complete: (scenarioId: string, data: { xpEarned: number; coinsEarned: number }) =>
    apiClient.post<void>(`/api/scenarios/${scenarioId}/complete`, data),
};

export const progressApi = {
  get: () =>
    apiClient.get<UserProgress>('/api/progress'),

  addReward: (xp: number, coins: number) =>
    apiClient.post<UserProgress>('/api/progress/reward', { xp, coins }),
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
  getTop: (limit = 20) =>
    apiClient.get<LeaderboardEntry[]>(`/api/leaderboard?limit=${limit}`),
};

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const aiApi = {
  sendMessage: (text: string, context?: string) =>
    apiClient.post<AiChatMessage>('/api/ai/chat', { text, context }),

  getHint: (scenarioId: string, stepId: string) =>
    apiClient.post<{ hint: string }>('/api/ai/hint', { scenarioId, stepId }),

  getSuggestions: () =>
    apiClient.get<string[]>('/api/ai/suggestions'),
};

export const achievementsApi = {
  getAll: () =>
    apiClient.get<Achievement[]>('/api/achievements'),
};
