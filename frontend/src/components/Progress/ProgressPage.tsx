import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import {
  accuracyLabel,
  accuracyPercent,
  buildCategoryRows,
  buildWeeklyBars,
  levelProgress,
  overallScenarioFraction,
  XP_PER_LEVEL,
} from '../../utils/progressStats';
import styles from './ProgressPage.module.css';

const DONUT_R = 54;
const DONUT_C = 2 * Math.PI * DONUT_R;

export default function ProgressPage() {
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const { progress, scenarios, achievements } = state;

  useEffect(() => {
    void actions.loadScenarios();
    void actions.loadProgress();
  }, [actions]);

  const weekly = useMemo(() => buildWeeklyBars(progress), [progress]);
  const categories = useMemo(
    () => buildCategoryRows(scenarios, progress.completedScenarioIds),
    [scenarios, progress.completedScenarioIds]
  );
  const fracDone = useMemo(
    () => overallScenarioFraction(scenarios, progress.completedScenarioIds),
    [scenarios, progress.completedScenarioIds]
  );
  const pctDone = Math.round(fracDone * 100);
  const acc = accuracyPercent(progress);
  const accStr = accuracyLabel(progress);
  const lvl = levelProgress(progress.xp);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.subtitle}>Прогресс</p>
            <h1 className={styles.title}>Как ты учишься</h1>
            <p className={styles.heroMeta}>
              Уровень {progress.level} · {progress.xp} оч. опыта · {progress.coins} монет
            </p>
          </div>
          <button type="button" className={styles.profileBtn} onClick={() => navigate('/profile?tab=settings')}
            aria-label="Настройки">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                fill="white"
              />
            </svg>
          </button>
        </div>
        <div className={styles.levelRow}>
          <div className={styles.levelRowText}>
            <span>До уровня {progress.level + 1}</span>
            <span className={styles.levelRowNums}>
              {lvl.inLevel}/{XP_PER_LEVEL} оч.
            </span>
          </div>
          <div className={styles.levelTrack}>
            <div className={styles.levelFill} style={{ width: `${lvl.percent}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{pctDone}%</span>
          <span className={styles.summaryLabel}>Сценарии пройдены</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{accStr}</span>
          <span className={styles.summaryLabel}>Точность ответов</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{progress.streak}</span>
          <span className={styles.summaryLabel}>Дней подряд</span>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <section className={styles.chartCard}>
          <h2 className={styles.chartTitle}>По категориям сценариев</h2>
          <div className={styles.hBarList}>
            {categories.map((row) => (
              <div key={row.name} className={styles.hBarRow}>
                <span className={styles.hBarName}>{row.name}</span>
                <div className={styles.hBarTrack}>
                  <div
                    className={styles.hBarFill}
                    style={{ width: `${row.pct}%`, background: row.color }}
                  />
                </div>
                <span className={styles.hBarNums}>
                  {row.done}/{row.total}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Все сценарии</h2>
          <div className={styles.donutWrap}>
            <svg viewBox="0 0 124 124" className={styles.donutSvg} aria-hidden>
              <circle cx="62" cy="62" r={DONUT_R} fill="none" stroke="var(--gray-200)" strokeWidth="12" />
              <circle
                cx="62"
                cy="62"
                r={DONUT_R}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="12"
                strokeLinecap="round"
                transform="rotate(-90 62 62)"
                strokeDasharray={`${fracDone * DONUT_C} ${DONUT_C}`}
                className={styles.donutArc}
              />
            </svg>
            <div className={styles.donutCenter}>
              <span className={styles.donutPct}>{pctDone}%</span>
              <span className={styles.donutSub}>готово</span>
            </div>
          </div>
        </section>

        <section className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Активность по дням</h2>
          <p className={styles.chartHint}>Подсветка — дни подряд с обучением</p>
          <div className={styles.weeklyChart}>
            {weekly.map((d, i) => (
              <div key={d.day} className={styles.chartColumn}>
                <div className={styles.chartBarWrap}>
                  <div
                    className={styles.chartBar}
                    style={{
                      height: `${d.value}%`,
                      background: d.active ? 'var(--primary)' : 'var(--gray-300)',
                      animationDelay: `${i * 0.06}s`,
                    }}
                  />
                </div>
                <span className={styles.chartLabel}>{d.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Ответы в квизах</h2>
          <div className={styles.splitBar}>
            <div className={styles.splitLabels}>
              <span>Верно</span>
              <span>Ошибки</span>
            </div>
            <div className={styles.splitTrack}>
              {progress.totalAnswers > 0 ? (
                <>
                  <div className={styles.splitOk} style={{ width: `${acc}%` }} />
                  <div className={styles.splitBad} style={{ width: `${100 - acc}%` }} />
                </>
              ) : (
                <div className={styles.splitNeutral} style={{ width: '100%' }} />
              )}
            </div>
            <p className={styles.splitMeta}>
              {progress.totalAnswers > 0
                ? `${progress.correctAnswers} из ${progress.totalAnswers} ответов`
                : 'Пока нет данных — пройди сценарий или мини-игру'}
            </p>
          </div>
        </section>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Достижения</h2>
        <div className={styles.achievementList}>
          {achievements.map((a, i) => (
            <div
              key={a.id}
              className={styles.achievementCard}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className={styles.achievementIcon} data-done={a.completed}>
                {a.completed ? '✓' : '·'}
              </div>
              <div className={styles.achievementInfo}>
                <span className={styles.achievementTitle}>{a.title}</span>
                <span className={styles.achievementDesc}>{a.description}</span>
              </div>
              {a.completed && (
                <div className={styles.checkMark} aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#E8F5E9" />
                    <path
                      d="M6 10L9 13L14 7"
                      stroke="#00C853"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
