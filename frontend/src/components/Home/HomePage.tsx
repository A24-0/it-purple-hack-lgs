import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { weeklyData } from '../../data/mockData';
import styles from './HomePage.module.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { state } = useApp();
  const { progress, scenarios } = state;

  const correctPercent = progress.totalAnswers > 0
    ? Math.round((progress.correctAnswers / progress.totalAnswers) * 100)
    : 0;
  const completedCount = progress.completedScenarioIds.length;
  const totalCount = scenarios.length;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.greeting}>
              Привет, {state.user?.name || 'Артём'} 👋
            </p>
            <h1 className={styles.appName}>СтрахоГид</h1>
          </div>
          <button
            className={styles.profileBtn}
            onClick={() => navigate('/settings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                fill="white"
              />
            </svg>
          </button>
        </div>

        <div className={styles.pointsSection}>
          <p className={styles.pointsLabel}>Твои баллы</p>
          <div className={styles.pointsRow}>
            <span className={styles.pointsValue}>{progress.xp} ★</span>
            <span className={styles.todayBadge}>+{progress.todayXp} сегодня</span>
          </div>
        </div>

        <div className={styles.progressBar}>
          <span className={styles.barLabel}>Неверно</span>
          <div className={styles.barTrack}>
            <div
              className={styles.barError}
              style={{ width: `${100 - correctPercent}%` }}
            />
            <div
              className={styles.barSuccess}
              style={{ width: `${correctPercent}%` }}
            />
          </div>
          <span className={styles.barLabel}>Верно</span>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{completedCount}/{totalCount}</span>
          <span className={styles.statLabel}>Сценарии{'\n'}пройдены</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{correctPercent}%</span>
          <span className={styles.statLabel}>Верных{'\n'}ответов</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{progress.streak}</span>
          <span className={styles.statLabel}>Дней{'\n'}подряд</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Сценарии 🎬</h2>
        <div className={styles.scenarioList}>
          {scenarios.map((s, i) => {
            const completed = progress.completedScenarioIds.includes(s.id);
            return (
              <button
                key={s.id}
                className={styles.scenarioCard}
                onClick={() => navigate(`/scenario/${s.id}`)}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={styles.scenarioIcon}>{s.icon}</div>
                <div className={styles.scenarioInfo}>
                  <span className={styles.scenarioTitle}>{s.title}</span>
                  <span className={styles.scenarioDesc}>{s.description}</span>
                </div>
                <div className={styles.scenarioRight}>
                  {completed ? (
                    <>
                      <span className={styles.scenarioXp}>+{s.maxXp} ★</span>
                      <span className={styles.scenarioStatus}>Пройден ✅</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.scenarioXpInactive}>0 ★</span>
                      <span className={styles.scenarioStart}>Начать →</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.quickActions}>
          <button className={styles.quickBtn} onClick={() => navigate('/ai-chat')}>
            <span className={styles.quickIcon}>🤖</span>
            <span className={styles.quickLabel}>AI-Помощник</span>
          </button>
          <button className={styles.quickBtn} onClick={() => navigate('/leaderboard')}>
            <span className={styles.quickIcon}>🏆</span>
            <span className={styles.quickLabel}>Лидерборд</span>
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Еженедельный отчёт 📅</h2>
        <div className={styles.weeklyChart}>
          {weeklyData.map((d, i) => (
            <div key={d.day} className={styles.chartColumn}>
              <div className={styles.chartBarWrap}>
                <div
                  className={styles.chartBar}
                  style={{
                    height: `${d.value}%`,
                    background: d.color,
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              </div>
              <span className={styles.chartLabel}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
