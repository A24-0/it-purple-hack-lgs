import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { levelProgress, XP_PER_LEVEL } from '../../utils/progressStats';
import SettingsPage from '../Settings/SettingsPage';
import styles from './ProfilePage.module.css';

type TabId = 'overview' | 'settings';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, actions } = useApp();
  const { progress, achievements } = state;
  const user = state.user;

  const tabParam = searchParams.get('tab');
  const tab: TabId = tabParam === 'settings' ? 'settings' : 'overview';

  useEffect(() => {
    if (tabParam === 'gallery') {
      setSearchParams({}, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const setTab = (next: TabId) => {
    setSearchParams(next === 'overview' ? {} : { tab: next });
  };

  useEffect(() => {
    void actions.loadAchievements();
    void actions.loadProgress();
  }, [actions]);

  const { percent: levelPercent, toNext, inLevel: xpInLevel } = levelProgress(progress.xp);
  const completedAchievements = achievements.filter((a) => a.completed).length;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className={styles.kicker}>Личный кабинет</p>
        <h1 className={styles.heroTitle}>Профиль</h1>
        <div className={styles.tabs} role="tablist">
          {(
            [
              ['overview', 'Обзор'],
              ['settings', 'Настройки'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <>
          <div className={styles.xpCard}>
            <div className={styles.avatarRow}>
              <div className={styles.avatarStatic} aria-hidden>
                <div className={styles.avatarPlaceholder}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                      fill="white"
                    />
                  </svg>
                </div>
              </div>
              <div className={styles.identity}>
                <h2 className={styles.userName}>{user?.name || 'Игрок'}</h2>
                <p className={styles.userLevel}>
                  Уровень {progress.level} · {progress.xp} оч. опыта
                </p>
              </div>
            </div>

            <div className={styles.xpHeader}>
              <span className={styles.xpLabel}>Прогресс уровня</span>
              <span className={styles.xpValue}>
                {xpInLevel}/{XP_PER_LEVEL} оч.
              </span>
            </div>
            <div className={styles.xpTrack}>
              <div className={styles.xpFill} style={{ width: `${levelPercent}%` }} />
            </div>
            <p className={styles.xpHint}>
              Ещё {toNext} оч. до уровня {progress.level + 1}
            </p>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{progress.streak}</span>
              <span className={styles.statLabel}>Дней подряд</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{progress.coins}</span>
              <span className={styles.statLabel}>Монеты</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{progress.completedScenarioIds.length}</span>
              <span className={styles.statLabel}>Сценариев</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>+{progress.todayXp}</span>
              <span className={styles.statLabel}>Очков сегодня</span>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Достижения</h2>
            <p className={styles.sectionSub}>
              Открыто {completedAchievements} из {achievements.length}
            </p>
            <div className={styles.badgeGrid}>
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className={`${styles.badgeCard} ${a.completed ? styles.badgeCompleted : styles.badgeLocked}`}
                >
                  <span className={styles.badgeIcon}>{a.icon}</span>
                  <span className={styles.badgeName}>{a.title}</span>
                  <span className={styles.badgeDesc}>{a.description}</span>
                  {!a.completed && <div className={styles.badgeLock}>ещё нет</div>}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Статистика</h2>
            <div className={styles.statsList}>
              <div className={styles.statsItem}>
                <span className={styles.statsItemLabel}>Всего ответов</span>
                <span className={styles.statsItemValue}>{progress.totalAnswers}</span>
              </div>
              <div className={styles.statsItem}>
                <span className={styles.statsItemLabel}>Верных ответов</span>
                <span className={styles.statsItemValue}>{progress.correctAnswers}</span>
              </div>
              <div className={styles.statsItem}>
                <span className={styles.statsItemLabel}>Точность</span>
                <span className={styles.statsItemValue}>
                  {progress.totalAnswers > 0
                    ? `${Math.round((progress.correctAnswers / progress.totalAnswers) * 100)}%`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'settings' && (
        <div className={styles.settingsWrap}>
          <SettingsPage embedded />
        </div>
      )}
    </div>
  );
}
