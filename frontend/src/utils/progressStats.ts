import type { Scenario, UserProgress } from '../types';

/** Очков опыта на один уровень (синхронно с API: level = 1 + xp // 200) */
export const XP_PER_LEVEL = 200;

export type WeeklyBar = { day: string; value: number; active: boolean };

/** Столбики «недели» — одна формула для главной и экрана прогресса */
export function buildWeeklyBars(progress: Pick<UserProgress, 'streak' | 'xp'>): WeeklyBar[] {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const base = Math.min(95, progress.streak * 12 + Math.min(40, progress.xp % 50));
  return days.map((day, i) => ({
    day,
    value: Math.min(100, Math.max(14, base + i * 6 - ((i * 7) % 23))),
    active: i < progress.streak,
  }));
}

export type CategoryRow = {
  name: string;
  color: string;
  done: number;
  total: number;
  pct: number;
};

const CAT_COLORS = ['#2563eb', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed', '#0d9488', '#db2777'];

export function buildCategoryRows(scenarios: Scenario[], completedIds: string[]): CategoryRow[] {
  const done = new Set(completedIds);
  const byCat = new Map<string, { total: number; done: number }>();
  scenarios.forEach((s) => {
    const c = s.category || 'Общее';
    if (!byCat.has(c)) byCat.set(c, { total: 0, done: 0 });
    const v = byCat.get(c)!;
    v.total += 1;
    if (done.has(s.id)) v.done += 1;
  });
  const rows = [...byCat.entries()].map(([name, v], i) => ({
    name,
    color: CAT_COLORS[i % CAT_COLORS.length],
    done: v.done,
    total: v.total,
    pct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0,
  }));
  return rows.length ? rows : [{ name: 'Сценарии', color: '#94a3b8', done: 0, total: 1, pct: 0 }];
}

export function overallScenarioFraction(scenarios: Scenario[], completedIds: string[]): number {
  if (scenarios.length === 0) return 0;
  const done = new Set(completedIds);
  return scenarios.filter((s) => done.has(s.id)).length / scenarios.length;
}

export function accuracyPercent(progress: UserProgress): number {
  return progress.totalAnswers > 0
    ? Math.round((progress.correctAnswers / progress.totalAnswers) * 100)
    : 0;
}

/** Для UI: при отсутствии данных — тире, не «0%». */
export function accuracyLabel(progress: UserProgress): string {
  if (progress.totalAnswers <= 0) return '—';
  return `${accuracyPercent(progress)}%`;
}

export function levelProgress(xp: number): { inLevel: number; percent: number; toNext: number } {
  const inLevel = xp % XP_PER_LEVEL;
  return {
    inLevel,
    percent: Math.round((inLevel / XP_PER_LEVEL) * 100),
    toNext: XP_PER_LEVEL - inLevel,
  };
}
