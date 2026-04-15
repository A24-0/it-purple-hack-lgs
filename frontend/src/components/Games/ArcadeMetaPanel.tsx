import { useEffect, useMemo, useState } from 'react';
import { gamesApi } from '../../api/endpoints';
import styles from './ArcadeMetaPanel.module.css';

type Entry = { rank: number; user_id: number; username: string | null; first_name: string | null; best_score: number };

type Props = {
  gameType: 'lane-rush' | 'catch-policies';
  score: number;
  flawlessRun: boolean;
  comboPeak: number;
  finished: boolean;
};

type Daily = {
  date: string;
  laneRuns: number;
  laneBest: number;
  laneFlawless: number;
  catchRuns: number;
  catchBest: number;
  catchFlawless: number;
};

const key = 'arcade-daily-v1';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readDaily(): Daily {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return {
      date: todayKey(),
      laneRuns: 0,
      laneBest: 0,
      laneFlawless: 0,
      catchRuns: 0,
      catchBest: 0,
      catchFlawless: 0,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Daily;
    if (parsed.date !== todayKey()) {
      return {
        date: todayKey(),
        laneRuns: 0,
        laneBest: 0,
        laneFlawless: 0,
        catchRuns: 0,
        catchBest: 0,
        catchFlawless: 0,
      };
    }
    return parsed;
  } catch {
    return {
      date: todayKey(),
      laneRuns: 0,
      laneBest: 0,
      laneFlawless: 0,
      catchRuns: 0,
      catchBest: 0,
      catchFlawless: 0,
    };
  }
}

function writeDaily(d: Daily) {
  localStorage.setItem(key, JSON.stringify(d));
}

export default function ArcadeMetaPanel({ gameType, score, flawlessRun, comboPeak, finished }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [daily, setDaily] = useState<Daily>(() => readDaily());
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    gamesApi
      .getTopByType(gameType, 8)
      .then((res) => setEntries(res.entries || []))
      .catch(() => setEntries([]));
  }, [gameType, finished]);

  useEffect(() => {
    if (!finished) return;
    const next = { ...readDaily() };
    if (gameType === 'lane-rush') {
      next.laneRuns += 1;
      next.laneBest = Math.max(next.laneBest, score);
      if (flawlessRun) next.laneFlawless += 1;
    } else {
      next.catchRuns += 1;
      next.catchBest = Math.max(next.catchBest, score);
      if (flawlessRun) next.catchFlawless += 1;
    }
    writeDaily(next);
    setDaily(next);
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 1100);
    return () => window.clearTimeout(t);
  }, [finished, gameType, score, flawlessRun]);

  const missions = useMemo(() => {
    const laneM1 = daily.laneRuns >= 2;
    const laneM2 = daily.laneBest >= 180;
    const laneM3 = daily.laneFlawless >= 1;

    const catchM1 = daily.catchRuns >= 2;
    const catchM2 = daily.catchBest >= 170;
    const catchM3 = daily.catchFlawless >= 1;

    return {
      lane: [
        { label: 'Сделать 2 забега в Три полосы', done: laneM1 },
        { label: 'Набрать 180+ в Три полосы', done: laneM2 },
        { label: 'Безошибочный забег в Три полосы', done: laneM3 },
      ],
      catch: [
        { label: 'Сделать 2 раунда в Полис-поймай', done: catchM1 },
        { label: 'Набрать 170+ в Полис-поймай', done: catchM2 },
        { label: 'Безошибочный раунд в Полис-поймай', done: catchM3 },
      ],
    };
  }, [daily]);

  const current = gameType === 'lane-rush' ? missions.lane : missions.catch;
  const completed = current.filter((m) => m.done).length;

  return (
    <section className={styles.wrap}>
      <div className={`${styles.reward} ${pulse ? styles.pulse : ''}`}>
        <div className={styles.rewardTitle}>Награда серии</div>
        <div className={styles.rewardValue}>{flawlessRun ? 'Без ошибок' : `Серия ×${comboPeak}`}</div>
      </div>

      <div className={styles.block}>
        <h3>Дневные миссии</h3>
        <p className={styles.sub}>Выполнено: {completed}/3</p>
        <ul className={styles.missions}>
          {current.map((m) => (
            <li key={m.label} className={m.done ? styles.done : ''}>
              <span>{m.done ? '✓' : '○'}</span>
              {m.label}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.block}>
        <h3>Таблица рекордов</h3>
        <p className={styles.sub}>Топ игроков по этой аркаде</p>
        {entries.length === 0 ? (
          <p className={styles.empty}>Пока нет данных, будь первым в топе.</p>
        ) : (
          <div className={styles.topList}>
            {entries.map((e) => (
              <div key={`${e.user_id}-${e.rank}`} className={styles.row}>
                <span className={styles.rank}>#{e.rank}</span>
                <span className={styles.name}>{e.first_name || e.username || 'Игрок'}</span>
                <strong className={styles.score}>{e.best_score}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
