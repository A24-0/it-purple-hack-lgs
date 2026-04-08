import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { policyChallenges } from '../../data/mockData';
import styles from './BuildPolicyGame.module.css';
import InstructionBadge from './InstructionBadge';

export default function BuildPolicyGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const challenge = policyChallenges[challengeIdx];
  const total = policyChallenges.length;

  const spent = useMemo(
    () => challenge.options.filter((o) => selectedIds.has(o.id)).reduce((s, o) => s + o.cost, 0),
    [selectedIds, challenge],
  );

  const coverage = useMemo(
    () => challenge.options.filter((o) => selectedIds.has(o.id)).reduce((s, o) => s + o.coveragePoints, 0),
    [selectedIds, challenge],
  );

  const remaining = challenge.budget - spent;
  const coveragePercent = Math.min(100, Math.round((coverage / challenge.targetCoverage) * 100));

  const toggleOption = (id: string) => {
    if (submitted) return;
    const opt = challenge.options.find((o) => o.id === id)!;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else if (spent + opt.cost <= challenge.budget) {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleNext = async () => {
    const newScores = [...scores, coveragePercent];
    if (challengeIdx + 1 >= total) {
      const avgScore = Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length);
      await actions.saveGameResult('build-policy', avgScore);
      setScores(newScores);
      setFinished(true);
    } else {
      setScores(newScores);
      setChallengeIdx((p) => p + 1);
      setSelectedIds(new Set());
      setSubmitted(false);
    }
  };

  if (finished) {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <div className={styles.resultIcon}>{avgScore >= 80 ? 'A' : avgScore >= 50 ? 'B' : 'C'}</div>
          <h2 className={styles.resultTitle}>Полисы собраны!</h2>
          <p className={styles.resultScore}>{avgScore}%</p>
          <p className={styles.resultSubtitle}>среднее покрытие</p>
          <div className={styles.resultRewards}>
            <span className={styles.rewardBadge}>+{Math.round(avgScore * 0.4)} XP</span>
            <span className={styles.rewardBadge}>+{Math.round(avgScore * 0.15)} ★</span>
          </div>
          <div className={styles.resultActions}>
            <button className={styles.primaryBtn} onClick={() => { setChallengeIdx(0); setSelectedIds(new Set()); setSubmitted(false); setScores([]); setFinished(false); }}>
              Играть снова
            </button>
            <button className={styles.secondaryBtn} onClick={() => navigate('/games')}>
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <InstructionBadge text="Выбирай опции полиса так, чтобы сохранить бюджет и набрать максимум покрытия." />
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/games')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className={styles.headerTitle}>Собери полис</h1>
        <span className={styles.counter}>{challengeIdx + 1}/{total}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.challengeCard}>
          <h2 className={styles.challengeTitle}>{challenge.title}</h2>
          <p className={styles.challengeDesc}>{challenge.description}</p>
        </div>

        <div className={styles.budgetBar}>
          <div className={styles.budgetInfo}>
            <span className={styles.budgetLabel}>Бюджет</span>
            <span className={styles.budgetValue}>
              {remaining.toLocaleString('ru-RU')} / {challenge.budget.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${remaining < 0 ? styles.barOver : ''}`}
              style={{ width: `${Math.min(100, (spent / challenge.budget) * 100)}%` }}
            />
          </div>
        </div>

        <div className={styles.coverageBar}>
          <div className={styles.budgetInfo}>
            <span className={styles.budgetLabel}>Покрытие</span>
            <span className={styles.budgetValue}>{coveragePercent}%</span>
          </div>
          <div className={styles.barTrack}>
            <div
              className={styles.coverageFill}
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
        </div>

        <div className={styles.optionsList}>
          {challenge.options.map((opt) => {
            const isSelected = selectedIds.has(opt.id);
            const canAfford = remaining >= opt.cost || isSelected;
            return (
              <button
                key={opt.id}
                className={`${styles.optionCard} ${isSelected ? styles.selected : ''} ${!canAfford && !submitted ? styles.disabled : ''}`}
                onClick={() => toggleOption(opt.id)}
                disabled={submitted || (!canAfford && !isSelected)}
              >
                <div className={styles.optionCheck}>
                  {isSelected ? '✓' : ''}
                </div>
                <div className={styles.optionInfo}>
                  <span className={styles.optionName}>{opt.name}</span>
                  <span className={styles.optionDesc}>{opt.description}</span>
                </div>
                <div className={styles.optionCost}>
                  {opt.cost.toLocaleString('ru-RU')} ₽
                </div>
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={selectedIds.size === 0}
          >
            Оформить полис
          </button>
        ) : (
          <div className={styles.resultCard}>
            <div className={styles.resultBadge}>
              {coveragePercent >= 80 ? 'Отличное покрытие' : coveragePercent >= 50 ? 'Неплохо' : 'Покрытие слабое'}
            </div>
            <p className={styles.resultText}>
              Ты потратил {spent.toLocaleString('ru-RU')} ₽ и получил {coveragePercent}% покрытия.
              {coveragePercent < 80 && ' Попробуй в следующий раз подобрать более важные опции.'}
            </p>
            <button className={styles.nextBtn} onClick={handleNext}>
              {challengeIdx + 1 >= total ? 'Посмотреть результат' : 'Следующий полис →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
