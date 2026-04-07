import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { riskCards } from '../../data/mockData';
import styles from './GuessRiskGame.module.css';

export default function GuessRiskGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [cardIndex, setCardIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const card = riskCards[cardIndex];
  const total = riskCards.length;

  const handleSelect = (optionId: string) => {
    if (selectedId) return;
    setSelectedId(optionId);
    if (card.options.find((o) => o.id === optionId)?.isCorrect) {
      setScore((p) => p + 1);
    }
  };

  const handleNext = () => {
    if (cardIndex + 1 >= total) {
      const xp = score * 15;
      const coins = score * 5;
      actions.earnReward(xp, coins);
      actions.saveGameResult('guess-risk', score, xp, coins);
      setFinished(true);
    } else {
      setCardIndex((p) => p + 1);
      setSelectedId(null);
    }
  };

  if (finished) {
    const percent = Math.round((score / total) * 100);
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <div className={styles.resultIcon}>
            {percent >= 70 ? '🎉' : percent >= 40 ? '👍' : '💪'}
          </div>
          <h2 className={styles.resultTitle}>Результат</h2>
          <p className={styles.resultScore}>
            {score}/{total}
          </p>
          <p className={styles.resultPercent}>{percent}% верных ответов</p>
          <div className={styles.resultRewards}>
            <span className={styles.rewardBadge}>+{score * 15} XP</span>
            <span className={styles.rewardBadge}>+{score * 5} ★</span>
          </div>
          <div className={styles.resultActions}>
            <button className={styles.primaryBtn} onClick={() => { setCardIndex(0); setSelectedId(null); setScore(0); setFinished(false); }}>
              Играть снова
            </button>
            <button className={styles.secondaryBtn} onClick={() => navigate('/')}>
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className={styles.headerTitle}>Угадай риск</h1>
        <span className={styles.counter}>
          {cardIndex + 1}/{total}
        </span>
      </div>

      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${((cardIndex + 1) / total) * 100}%` }}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.situationCard}>
          <p className={styles.situationText}>{card.situation}</p>
        </div>

        <p className={styles.choicesLabel}>Какой вид страхования поможет?</p>

        <div className={styles.optionsList}>
          {card.options.map((opt) => {
            let cls = styles.optionBtn;
            if (selectedId) {
              if (opt.isCorrect) cls += ` ${styles.correct}`;
              else if (opt.id === selectedId) cls += ` ${styles.incorrect}`;
              else cls += ` ${styles.dimmed}`;
            }
            return (
              <button
                key={opt.id}
                className={cls}
                onClick={() => handleSelect(opt.id)}
                disabled={!!selectedId}
              >
                {opt.text}
              </button>
            );
          })}
        </div>

        {selectedId && (
          <div className={styles.explanationCard}>
            <p className={styles.explanationText}>{card.explanation}</p>
            <button className={styles.nextBtn} onClick={handleNext}>
              {cardIndex + 1 >= total ? 'Посмотреть результат' : 'Следующий вопрос →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
