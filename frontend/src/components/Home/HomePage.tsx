import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './HomePage.module.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { state } = useApp();
  const { progress, scenarios } = state;

  const weeklyData = useMemo(() => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const base = Math.min(95, progress.streak * 12 + Math.min(40, progress.xp % 50));
    return days.map((day, i) => ({
      day,
      value: Math.min(100, Math.max(14, base + i * 6 - ((i * 7) % 23))),
      active: i < progress.streak,
    }));
  }, [progress.streak, progress.xp]);

  const correctPercent =
    progress.totalAnswers > 0 ? Math.round((progress.correctAnswers / progress.totalAnswers) * 100) : 0;
  const completedCount = progress.completedScenarioIds.length;
  const totalCount = scenarios.length;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.greeting}>Привет, {state.user?.name || 'игрок'}</p>
            <h1 className={styles.appName}>СтрахоГид</h1>
          </div>
          <button type="button" className={styles.profileBtn} onClick={() => navigate('/profile')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                fill="white"
              />
            </svg>
          </button>
        </div>

        <div className={styles.pointsSection}>
          <p className={styles.pointsLabel}>Баллы</p>
          <div className={styles.pointsRow}>
            <span className={styles.pointsValue}>{progress.xp}</span>
            <span className={styles.todayBadge}>+{progress.todayXp} сегодня</span>
          </div>
        </div>

        <div className={styles.progressBar}>
          <span className={styles.barLabel}>Ошибки</span>
          <div className={styles.barTrack}>
            <div className={styles.barError} style={{ width: `${100 - correctPercent}%` }} />
            <div className={styles.barSuccess} style={{ width: `${correctPercent}%` }} />
          </div>
          <span className={styles.barLabel}>Верно</span>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {completedCount}/{totalCount}
          </span>
          <span className={styles.statLabel}>Сценарии пройдены</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{correctPercent}%</span>
          <span className={styles.statLabel}>Точность ответов</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{progress.streak}</span>
          <span className={styles.statLabel}>Дней подряд</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Сценарии</h2>
        <div className={styles.scenarioList}>
          {scenarios.map((s, i) => {
            const completed = progress.completedScenarioIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className={styles.scenarioCard}
                onClick={() => navigate(`/scenario/${s.id}`)}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={styles.scenarioIcon}>S{i + 1}</div>
                <div className={styles.scenarioInfo}>
                  <span className={styles.scenarioTitle}>{s.title}</span>
                  <span className={styles.scenarioDesc}>{s.description}</span>
                </div>
                <div className={styles.scenarioRight}>
                  {completed ? (
                    <>
                      <span className={styles.scenarioXp}>+{s.maxXp}</span>
                      <span className={styles.scenarioStatus}>Готово</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.scenarioXpInactive}>0</span>
                      <span className={styles.scenarioStart}>Играть</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.gamesRow}>
          <h2 className={styles.sectionTitle}>Мини-игры</h2>
          <button type="button" className={styles.allGamesBtn} onClick={() => navigate('/games')}>
            Все режимы
          </button>
        </div>
        <div className={styles.quickActions}>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/game/daily-quiz')}>
            <span className={styles.quickIcon} data-variant="orange" />
            <span className={styles.quickLabel}>Блиц-вопросы</span>
          </button>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/game/term-snap')}>
            <span className={styles.quickIcon} data-variant="teal" />
            <span className={styles.quickLabel}>Факт или миф</span>
          </button>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/game/lane-rush')}>
            <span className={styles.quickIcon} data-variant="slate" />
            <span className={styles.quickLabel}>Логика выплат</span>
          </button>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/game/catch-policies')}>
            <span className={styles.quickIcon} data-variant="violet" />
            <span className={styles.quickLabel}>Конструктор защиты</span>
          </button>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/game/claim-detective')}>
            <span className={styles.quickIcon} data-variant="slate" />
            <span className={styles.quickLabel}>Claim Detective</span>
          </button>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/game/memory-terms')}>
            <span className={styles.quickIcon} data-variant="mint" />
            <span className={styles.quickLabel}>Память терминов</span>
          </button>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/game/insurance-sorter')}>
            <span className={styles.quickIcon} data-variant="orange" />
            <span className={styles.quickLabel}>Сортировка полисов</span>
          </button>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/game/quiz-battle')}>
            <span className={styles.quickIcon} data-variant="slate" />
            <span className={styles.quickLabel}>Баттл с ботом</span>
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.gamesRow}>
          <h2 className={styles.sectionTitle}>Мотивация</h2>
        </div>
        <div className={styles.quickActions}>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/rewards')}>
            <span className={styles.quickIcon} data-variant="cup" />
            <span className={styles.quickLabel}>Награды дня</span>
          </button>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/telegram')}>
            <span className={styles.quickIcon} data-variant="help" />
            <span className={styles.quickLabel}>Подключить Telegram</span>
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.quickActions}>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/help')}>
            <span className={styles.quickIcon} data-variant="help" />
            <span className={styles.quickLabel}>Справка</span>
          </button>
          <button type="button" className={styles.quickBtn} onClick={() => navigate('/leaderboard')}>
            <span className={styles.quickIcon} data-variant="cup" />
            <span className={styles.quickLabel}>Рейтинг</span>
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Активность по дням</h2>
        <div className={styles.weeklyChart}>
          {weeklyData.map((d, i) => (
            <div key={d.day} className={styles.chartColumn}>
              <div className={styles.chartBarWrap}>
                <div
                  className={styles.chartBar}
                  style={{
                    height: `${d.value}%`,
                    background: d.active ? 'var(--primary)' : 'var(--gray-300)',
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
