import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { APP_NAME } from '../../config/app';
import { scenariosApi, type ScenarioStartResponse } from '../../api/endpoints';
import { telegramShareResult, isTelegramWebApp } from '../../api/telegram';
import styles from './ScenarioWalkthrough.module.css';

type Phase = 'loading' | 'error' | 'playing' | 'wrong' | 'completed';

type StepShape = ScenarioStartResponse['step'];

export default function ScenarioWalkthrough() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, actions } = useApp();

  const scenarioIdNum = id ? parseInt(id, 10) : NaN;
  const scenarioMeta = useMemo(
    () => state.scenarios.find((s) => s.id === id),
    [id, state.scenarios]
  );

  const [phase, setPhase] = useState<Phase>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [progressId, setProgressId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<StepShape | null>(null);
  const [totalSteps, setTotalSteps] = useState(1);
  const [stepDone, setStepDone] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintText, setHintText] = useState('');
  const [hintLoading, setHintLoading] = useState(false);

  const startFresh = useCallback(async () => {
    if (!id || Number.isNaN(scenarioIdNum)) {
      setPhase('error');
      setErrMsg('Некорректный сценарий');
      return;
    }
    setPhase('loading');
    setErrMsg('');
    try {
      const res = await scenariosApi.start(scenarioIdNum);
      setProgressId(res.progress_id);
      setCurrentStep(res.step);
      setTotalSteps(res.total_steps);
      setStepDone(0);
      setXpEarned(0);
      setLastFeedback(null);
      setPhase('playing');
    } catch (e) {
      setErrMsg((e as Error).message || 'Не удалось начать сценарий');
      setPhase('error');
    }
  }, [id, scenarioIdNum]);

  useEffect(() => {
    startFresh();
  }, [startFresh]);

  const title = scenarioMeta?.title || 'Сценарий';
  const icon = 'SC';

  const handlePickAnswer = async (answerText: string) => {
    if (!progressId || phase !== 'playing') return;
    try {
      const res = await scenariosApi.answer(progressId, answerText);
      if (!res.correct) {
        setLastFeedback(res.feedback || 'Попробуй другой вариант.');
        setPhase('wrong');
        return;
      }
      if (res.completed) {
        setXpEarned(res.xp_earned);
        actions.completeScenario(String(scenarioIdNum));
        await actions.refreshSessionData();
        setPhase('completed');
        return;
      }
      if (res.next_step) {
        setCurrentStep(res.next_step);
        setStepDone((d) => d + 1);
        setPhase('playing');
      }
    } catch (e) {
      setErrMsg((e as Error).message);
      setPhase('error');
    }
  };

  const handleHint = useCallback(async () => {
    if (!currentStep || hintLoading) return;
    setHintOpen(true);
    setHintLoading(true);
    try {
      const hint = await actions.getHint(String(scenarioIdNum), String(currentStep.id));
      setHintText(hint);
    } catch {
      setHintText('Не удалось получить подсказку.');
    } finally {
      setHintLoading(false);
    }
  }, [actions, currentStep, scenarioIdNum, hintLoading]);

  if (phase === 'loading' || (phase === 'playing' && !currentStep)) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p>Загрузка сценария…</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p>{errMsg}</p>
          <button type="button" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  const choices = currentStep?.choices ?? [];
  const progressPct =
    phase === 'completed'
      ? 100
      : Math.min(100, Math.round(((stepDone + 1) / Math.max(1, totalSteps)) * 100));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className={styles.headerInfo}>
          <span className={styles.headerIcon}>{icon}</span>
          <span className={styles.headerTitle}>{title}</span>
        </div>
        <span className={styles.stepCounter}>
          {stepDone + 1}/{totalSteps}
        </span>
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>

      <div className={styles.content}>
        {phase === 'playing' && currentStep && (
          <>
            <div className={styles.situationCard}>
              <p className={styles.situationText}>{currentStep.prompt}</p>
            </div>
            <div className={styles.choicesSection}>
              <p className={styles.choicesLabel}>Выбери ответ:</p>
              <div className={styles.choicesList}>
                {choices.map((c, i) => (
                  <button
                    key={`${currentStep.id}-${i}`}
                    type="button"
                    className={styles.choiceBtn}
                    onClick={() => handlePickAnswer(c.text)}
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    <span className={styles.choiceNumber}>{i + 1}</span>
                    {c.text}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {phase === 'wrong' && (
          <div className={styles.consequenceSection}>
            <div className={`${styles.consequenceCard} ${styles.consequenceSuboptimal}`}>
              <div className={styles.consequenceBadge}>Пока неверно</div>
              <p className={styles.consequenceText}>{lastFeedback}</p>
            </div>
            <button type="button" className={styles.continueBtn} onClick={() => setPhase('playing')}>
              Попробовать снова
            </button>
          </div>
        )}

        {phase === 'completed' && (
          <div className={styles.completedSection}>
            <div className={styles.completedIcon}>✓</div>
            <h2 className={styles.completedTitle}>Сценарий пройден!</h2>
            <p className={styles.completedSubtitle}>{title}</p>
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statBoxValue}>{xpEarned}</span>
                <span className={styles.statBoxLabel}>оч. опыта</span>
              </div>
            </div>
            <div className={styles.completedActions}>
              <button
                type="button"
                className={styles.shareBtn}
                onClick={() => {
                  const text = `${APP_NAME}\nПройден сценарий «${title}»\nПолучено: ${xpEarned} оч. опыта`;
                  if (isTelegramWebApp()) telegramShareResult(text);
                  else {
                    void navigator.clipboard?.writeText(text);
                    alert('Результат скопирован!');
                  }
                }}
              >
                Поделиться
              </button>
              <button type="button" className={styles.replayBtn} onClick={() => void startFresh()}>
                Пройти заново
              </button>
              <button type="button" className={styles.homeBtn} onClick={() => navigate('/')}>
                На главную
              </button>
            </div>
          </div>
        )}
      </div>

      {phase === 'playing' && (
        <button type="button" className={styles.hintFab} onClick={() => void handleHint()} title="Подсказка">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H15M12 3C8.68629 3 6 5.68629 6 9C6 11.22 7.21 13.16 9 14.19V17H15V14.19C16.79 13.16 18 11.22 18 9C18 5.68629 15.3137 3 12 3Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {hintOpen && (
        <div
          className={styles.hintOverlay}
          onClick={() => setHintOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setHintOpen(false)}
          role="presentation"
        >
          <div className={styles.hintModal} onClick={(e) => e.stopPropagation()} role="dialog">
            <div className={styles.hintHeader}>
              <span>Подсказка</span>
              <button type="button" className={styles.hintClose} onClick={() => setHintOpen(false)}>
                ✕
              </button>
            </div>
            <div className={styles.hintBody}>
              {hintLoading ? (
                <div className={styles.hintLoader}>
                  <div className={styles.typing}>
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>Думаю...</p>
                </div>
              ) : (
                <p className={styles.hintTextContent}>{hintText}</p>
              )}
            </div>
            <button type="button" className={styles.hintChatBtn} onClick={() => navigate('/help')}>
              Открыть справку
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
