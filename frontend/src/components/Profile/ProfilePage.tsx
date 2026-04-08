import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { state } = useApp();
  const { progress, achievements } = state;

  const xpForNext = 100;
  const xpInLevel = progress.xp % xpForNext;
  const levelPercent = Math.round((xpInLevel / xpForNext) * 100);
  const completedAchievements = achievements.filter((a) => a.completed).length;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="white" />
            </svg>
          </div>
          <h1 className={styles.userName}>{state.user?.name || 'Игрок'}</h1>
          <p className={styles.userLevel}>Уровень {progress.level}</p>
        </div>
      </div>

      <div className={styles.xpCard}>
        <div className={styles.xpHeader}>
          <span className={styles.xpLabel}>Опыт</span>
          <span className={styles.xpValue}>{progress.xp} XP</span>
        </div>
        <div className={styles.xpTrack}>
          <div className={styles.xpFill} style={{ width: `${levelPercent}%` }} />
        </div>
        <p className={styles.xpHint}>
          {xpForNext - xpInLevel} XP до уровня {progress.level + 1}
        </p>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>S</span>
          <span className={styles.statValue}>{progress.streak}</span>
          <span className={styles.statLabel}>Дней подряд</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>P</span>
          <span className={styles.statValue}>{progress.coins}</span>
          <span className={styles.statLabel}>Баллы</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>C</span>
          <span className={styles.statValue}>{progress.completedScenarioIds.length}</span>
          <span className={styles.statLabel}>Сценарии</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Бейджи</h2>
        <p className={styles.sectionSub}>
          {completedAchievements}/{achievements.length} получено
        </p>
        <div className={styles.badgeGrid}>
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`${styles.badgeCard} ${a.completed ? styles.badgeCompleted : styles.badgeLocked}`}
            >
              <span className={styles.badgeIcon}>{a.completed ? 'DONE' : 'NEW'}</span>
              <span className={styles.badgeName}>{a.title}</span>
              <span className={styles.badgeDesc}>{a.description}</span>
              {!a.completed && <div className={styles.badgeLock}>LOCK</div>}
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
                ? Math.round((progress.correctAnswers / progress.totalAnswers) * 100)
                : 0}%
            </span>
          </div>
          <div className={styles.statsItem}>
            <span className={styles.statsItemLabel}>XP сегодня</span>
            <span className={styles.statsItemValue}>+{progress.todayXp}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
