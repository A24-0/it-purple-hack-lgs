import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './LeaderboardPage.module.css';

const medals = ['#1', '#2', '#3'];
const periods = [
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'all', label: 'Всё время' },
] as const;

type Period = typeof periods[number]['key'];

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const [period, setPeriod] = useState<Period>('week');

  useEffect(() => {
    actions.loadLeaderboard(period);
  }, [actions, period]);

  const top3 = state.leaderboard.slice(0, 3);
  const rest = state.leaderboard.slice(3);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className={styles.title}>Лидерборд</h1>
          <div style={{ width: 44 }} />
        </div>

        <div className={styles.periodTabs}>
          {periods.map((p) => (
            <button
              key={p.key}
              className={`${styles.periodTab} ${period === p.key ? styles.periodActive : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {top3.length >= 3 && (
          <div className={styles.podium}>
            <div className={styles.podiumItem}>
              <div className={`${styles.podiumAvatar} ${styles.silver}`}>
                {top3[1].name[0]}
              </div>
              <span className={styles.podiumName}>{top3[1].name}</span>
              <span className={styles.podiumXp}>{top3[1].xp} оч.</span>
              <div className={`${styles.podiumBar} ${styles.barSilver}`}>
                <span className={styles.podiumMedal}>{medals[1]}</span>
              </div>
            </div>

            <div className={styles.podiumItem}>
              <div className={`${styles.podiumAvatar} ${styles.gold}`}>
                {top3[0].name[0]}
              </div>
              <span className={styles.podiumName}>{top3[0].name}</span>
              <span className={styles.podiumXp}>{top3[0].xp} оч.</span>
              <div className={`${styles.podiumBar} ${styles.barGold}`}>
                <span className={styles.podiumMedal}>{medals[0]}</span>
              </div>
            </div>

            <div className={styles.podiumItem}>
              <div className={`${styles.podiumAvatar} ${styles.bronze}`}>
                {top3[2].name[0]}
              </div>
              <span className={styles.podiumName}>{top3[2].name}</span>
              <span className={styles.podiumXp}>{top3[2].xp} оч.</span>
              <div className={`${styles.podiumBar} ${styles.barBronze}`}>
                <span className={styles.podiumMedal}>{medals[2]}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.list}>
        {rest.map((entry) => (
          <div key={entry.userId} className={styles.listItem}>
            <span className={styles.rank}>#{entry.rank}</span>
            <div className={styles.listAvatar}>{entry.name[0]}</div>
            <div className={styles.listInfo}>
              <span className={styles.listName}>{entry.name}</span>
              <span className={styles.listLevel}>Уровень {entry.level}</span>
            </div>
            <div className={styles.listRight}>
              <span className={styles.listXp}>{entry.xp} оч.</span>
              <span className={styles.listScenarios}>
                {entry.completedScenarios} сценариев
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
