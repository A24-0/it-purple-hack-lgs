import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './ProgressPage.module.css';

export default function ProgressPage() {
  const navigate = useNavigate();
  const { state } = useApp();

  const categoryCoverage = useMemo(() => {
    const colors = ['#2979FF', '#00C853', '#FFD740', '#FF5252', '#7C4DFF'];
    const byCat = new Map<string, { total: number; done: number }>();
    const done = new Set(state.progress.completedScenarioIds);
    state.scenarios.forEach((s) => {
      const c = s.category || 'Общее';
      if (!byCat.has(c)) byCat.set(c, { total: 0, done: 0 });
      const v = byCat.get(c)!;
      v.total += 1;
      if (done.has(s.id)) v.done += 1;
    });
    const rows = [...byCat.entries()].map(([name, v], i) => ({
      name,
      color: colors[i % colors.length],
      completed: v.done,
      total: v.total,
    }));
    if (rows.length === 0) {
      return [{ name: 'Сценарии', color: '#B0BEC5', completed: 0, total: 1 }];
    }
    return rows;
  }, [state.scenarios, state.progress.completedScenarioIds]);

  const totalSegments = categoryCoverage.length;
  const segmentAngle = 360 / totalSegments;
  const gapAngle = 12;
  const radius = 80;
  const strokeWidth = 14;
  const center = 100;

  function describeArc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  function polarToCartesian(
    cx: number,
    cy: number,
    r: number,
    angleDeg: number
  ) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.subtitle}>Прогресс</p>
            <h1 className={styles.title}>Мои результаты</h1>
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
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Покрытие сценариев</h2>

        <div className={styles.ringContainer}>
          <svg viewBox="0 0 200 200" className={styles.ring}>
            {categoryCoverage.map((cat, i) => {
              const startAngle = i * segmentAngle + gapAngle / 2;
              const endAngle = (i + 1) * segmentAngle - gapAngle / 2;
              return (
                <path
                  key={cat.name}
                  d={describeArc(center, center, radius, startAngle, endAngle)}
                  stroke={cat.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  className={styles.ringSegment}
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              );
            })}
          </svg>
          <div className={styles.ringCenter}>
            <span className={styles.ringBold}>Эта</span>
            <span className={styles.ringLight}>неделя</span>
          </div>
        </div>

        <div className={styles.legend}>
          {categoryCoverage.map((cat) => (
            <div key={cat.name} className={styles.legendItem}>
              <div className={styles.legendLeft}>
                <span
                  className={styles.dot}
                  style={{ background: cat.color }}
                />
                <span className={styles.legendName}>{cat.name}</span>
              </div>
              <span className={styles.legendValue}>
                {cat.completed}/{cat.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Достижения</h2>
        <div className={styles.achievementList}>
          {state.achievements.map((a, i) => (
            <div
              key={a.id}
              className={styles.achievementCard}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={styles.achievementIcon}>{a.completed ? 'OK' : 'TODO'}</div>
              <div className={styles.achievementInfo}>
                <span className={styles.achievementTitle}>{a.title}</span>
                <span className={styles.achievementDesc}>{a.description}</span>
              </div>
              {a.completed && (
                <div className={styles.checkMark}>
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
