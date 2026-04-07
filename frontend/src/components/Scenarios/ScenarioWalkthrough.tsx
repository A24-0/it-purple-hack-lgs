import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { telegramShareResult, isTelegramWebApp } from '../../api/telegram';
import type { ScenarioChoice } from '../../types';
import styles from './ScenarioWalkthrough.module.css';

type Phase = 'playing' | 'consequence' | 'completed';

export default function ScenarioWalkthrough() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, actions } = useApp();

  const scenario = useMemo(
    () => state.scenarios.find((s) => s.id === id),
    [id, state.scenarios]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [selectedChoice, setSelectedChoice] = useState<ScenarioChoice | null>(null);
  const [earnedXp, setEarnedXp] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [totalChoices, setTotalChoices] = useState(0);
  const [optimalChoices, setOptimalChoices] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const [hintOpen, setHintOpen] = useState(false);
  const [hintText, setHintText] = useState('');
  const [hintLoading, setHintLoading] = useState(false);

  if (!scenario) {
    return (
      <div className={styles.notFound}>
        <p>Сценарий не найден</p>
        <button onClick={() => navigate('/')}>На главную</button>
      </div>
    );
  }

  const currentStep = scenario.steps[stepIndex];

  const handleChoiceSelect = (choice: ScenarioChoice) => {
    if (navigator.vibrate) navigator.vibrate(30);
    setSelectedChoice(choice);
    setEarnedXp((prev) => prev + choice.xpDelta);
    setEarnedCoins((prev) => prev + choice.coinsDelta);
    setTotalChoices((prev) => prev + 1);
    if (choice.isOptimal) setOptimalChoices((prev) => prev + 1);
    setPhase('consequence');
  };

  const handleContinue = () => {
    if (!selectedChoice) return;

    if (currentStep.isTerminal || !selectedChoice.nextStepId) {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      actions.earnReward(earnedXp, earnedCoins);
      if (id) actions.completeScenario(id);
      setPhase('completed');
    } else {
      setTransitioning(true);
      setTimeout(() => {
        const nextIdx = scenario.steps.findIndex(
          (s) => s.id === selectedChoice.nextStepId
        );
        setStepIndex(nextIdx !== -1 ? nextIdx : stepIndex + 1);
        setSelectedChoice(null);
        setPhase('playing');
        setTransitioning(false);
      }, 300);
    }
  };

  const handleReplay = () => {
    setStepIndex(0);
    setPhase('playing');
    setSelectedChoice(null);
    setEarnedXp(0);
    setEarnedCoins(0);
    setTotalChoices(0);
    setOptimalChoices(0);
    setHintText('');
  };

  const handleHint = useCallback(async () => {
    if (hintLoading) return;
    setHintOpen(true);
    setHintLoading(true);
    try {
      const hint = await actions.getHint(scenario.id, currentStep.id);
      setHintText(hint);
    } catch {
      setHintText('Не удалось получить подсказку. Попробуй ещё раз!');
    } finally {
      setHintLoading(false);
    }
  }, [actions, scenario.id, currentStep.id, hintLoading]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className={styles.headerInfo}>
          <span className={styles.headerIcon}>{scenario.icon}</span>
          <span className={styles.headerTitle}>{scenario.title}</span>
        </div>
        <span className={styles.stepCounter}>
          {stepIndex + 1}/{scenario.steps.length}
        </span>
      </div>

      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{
            width: `${
              phase === 'completed'
                ? 100
                : ((stepIndex + 1) / scenario.steps.length) * 100
            }%`,
          }}
        />
      </div>

      <div className={`${styles.content} ${transitioning ? styles.fadeOut : styles.fadeIn}`}>
        {phase === 'playing' && (
          <>
            <div className={styles.situationCard}>
              <p className={styles.situationText}>{currentStep.situation}</p>
            </div>

            <div className={styles.choicesSection}>
              <p className={styles.choicesLabel}>Выбери действие:</p>
              <div className={styles.choicesList}>
                {currentStep.choices.map((choice, i) => (
                  <button
                    key={choice.id}
                    className={styles.choiceBtn}
                    onClick={() => handleChoiceSelect(choice)}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <span className={styles.choiceNumber}>{i + 1}</span>
                    {choice.text}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {phase === 'consequence' && selectedChoice && (
          <div className={styles.consequenceSection}>
            <div
              className={`${styles.consequenceCard} ${
                selectedChoice.isOptimal
                  ? styles.consequenceOptimal
                  : styles.consequenceSuboptimal
              }`}
            >
              <div className={styles.consequenceBadge}>
                {selectedChoice.isOptimal ? '✅ Отличный выбор!' : '⚠️ Можно лучше'}
              </div>
              <p className={styles.consequenceText}>
                {selectedChoice.consequence}
              </p>
              <div className={styles.rewardRow}>
                {selectedChoice.xpDelta > 0 && (
                  <span className={`${styles.rewardBadge} ${styles.rewardPop}`}>
                    +{selectedChoice.xpDelta} XP
                  </span>
                )}
                {selectedChoice.coinsDelta > 0 && (
                  <span className={`${styles.rewardBadge} ${styles.rewardPop}`} style={{ animationDelay: '0.1s' }}>
                    +{selectedChoice.coinsDelta} ★
                  </span>
                )}
              </div>
            </div>

            <button className={styles.continueBtn} onClick={handleContinue}>
              {currentStep.isTerminal || !selectedChoice.nextStepId
                ? 'Завершить сценарий'
                : 'Следующий шаг →'}
            </button>
          </div>
        )}

        {phase === 'completed' && (
          <div className={styles.completedSection}>
            <div className={styles.completedIcon}>🎉</div>
            <h2 className={styles.completedTitle}>Сценарий пройден!</h2>
            <p className={styles.completedSubtitle}>{scenario.title}</p>

            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statBoxValue}>{earnedXp}</span>
                <span className={styles.statBoxLabel}>XP заработано</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statBoxValue}>{earnedCoins}</span>
                <span className={styles.statBoxLabel}>Баллов ★</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statBoxValue}>
                  {totalChoices > 0
                    ? Math.round((optimalChoices / totalChoices) * 100)
                    : 0}%
                </span>
                <span className={styles.statBoxLabel}>Верных ответов</span>
              </div>
            </div>

            <div className={styles.completedActions}>
              <button
                className={styles.shareBtn}
                onClick={() => {
                  const text = `🛡️ СтрахоГид\nПрошёл сценарий «${scenario.title}»!\n⚡ ${earnedXp} XP | ✅ ${totalChoices > 0 ? Math.round((optimalChoices / totalChoices) * 100) : 0}% верных ответов\nПопробуй и ты!`;
                  if (isTelegramWebApp()) {
                    telegramShareResult(text);
                  } else {
                    navigator.clipboard?.writeText(text);
                    alert('Результат скопирован!');
                  }
                }}
              >
                📤 Поделиться результатом
              </button>
              <button className={styles.replayBtn} onClick={handleReplay}>
                🔄 Пройти заново
              </button>
              <button className={styles.homeBtn} onClick={() => navigate('/')}>
                На главную
              </button>
            </div>
          </div>
        )}
      </div>

      {phase === 'playing' && (
        <button className={styles.hintFab} onClick={handleHint} title="Попросить подсказку">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H15M12 3C8.68629 3 6 5.68629 6 9C6 11.22 7.21 13.16 9 14.19V17H15V14.19C16.79 13.16 18 11.22 18 9C18 5.68629 15.3137 3 12 3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {hintOpen && (
        <div className={styles.hintOverlay} onClick={() => setHintOpen(false)}>
          <div className={styles.hintModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.hintHeader}>
              <span>🤖 AI-Подсказка</span>
              <button className={styles.hintClose} onClick={() => setHintOpen(false)}>✕</button>
            </div>
            <div className={styles.hintBody}>
              {hintLoading ? (
                <div className={styles.hintLoader}>
                  <div className={styles.typing}>
                    <span /><span /><span />
                  </div>
                  <p>Думаю...</p>
                </div>
              ) : (
                <p className={styles.hintTextContent}>{hintText}</p>
              )}
            </div>
            <button className={styles.hintChatBtn} onClick={() => navigate('/ai-chat')}>
              💬 Открыть чат с AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
