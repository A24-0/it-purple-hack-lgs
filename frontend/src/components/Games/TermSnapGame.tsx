import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './GuessRiskGame.module.css';
import snapStyles from './TermSnapGame.module.css';
import InstructionBadge from './InstructionBadge';

const ROUNDS = 10;
const MS = 5000;

const ROUNDS_DATA: { statement: string; correct: boolean }[] = [
  { statement: 'ОСАГО обязательно для всех владельцев ТС, допущенных к дорогам', correct: true },
  { statement: 'КАСКО — это обязательная страховка для каждого автомобиля', correct: false },
  { statement: 'Франшиза — часть убытка, которую клиент оплачивает сам', correct: true },
  { statement: 'Страховая всегда выплачивает 100% стоимости без условий', correct: false },
  { statement: 'Выгодоприобретатель — тот, кому могут выплатить по договору', correct: true },
  { statement: 'После ДТП можно сразу чинить машину, а потом сообщить в страховую', correct: false },
  { statement: 'Страховой случай — событие из договора, при котором возможна выплата', correct: true },
  { statement: 'Путешествуя за границей, медстраховка не нужна — достаточно паспорта', correct: false },
  { statement: 'Бонус-малус влияет на стоимость ОСАГО за историю аварийности', correct: true },
  { statement: 'Страховка от несчастного случая покрывает только спорт в зале', correct: false },
];

export default function TermSnapGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(1);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRoundTimer = useCallback(() => {
    clearTimer();
    startRef.current = Date.now();
    setProgress(1);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.max(0, 1 - elapsed / MS);
      setProgress(p);
      if (p <= 0) {
        clearTimer();
        setRound((r) => {
          if (r >= ROUNDS - 1) {
            setPhase('done');
            return r;
          }
          return r + 1;
        });
      }
    }, 40);
  }, [clearTimer]);

  useEffect(() => {
    if (phase !== 'play') return;
    startRoundTimer();
    return () => clearTimer();
  }, [phase, round, startRoundTimer, clearTimer]);

  useEffect(() => {
    if (phase !== 'done' || saved) return;
    setSaved(true);
    void actions.saveGameResult('term-snap', score);
  }, [phase, score, saved, actions]);

  const current = ROUNDS_DATA[round % ROUNDS_DATA.length];

  const answer = (picked: boolean) => {
    if (phase !== 'play') return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startRef.current;
    const left = Math.max(0, 1 - elapsed / MS);
    const speedBonus = Math.floor(left * 8);
    if (picked === current.correct) setScore((s) => s + 10 + speedBonus);
    if (round >= ROUNDS - 1) {
      setPhase('done');
      return;
    }
    setRound((r) => r + 1);
  };

  if (phase === 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <h2 className={styles.resultTitle}>Серия завершена</h2>
          <p className={styles.resultScore}>{score}</p>
          <p className={styles.resultPercent}>очков · бонус за скорость, пока горит полоска</p>
          <div className={styles.resultActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => {
                setSaved(false);
                setScore(0);
                setRound(0);
                setPhase('ready');
              }}
            >
              Ещё раз
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/games')}>
              К играм
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <InstructionBadge text="Прочитай утверждение и быстро выбери: верно или неверно. Скорость дает бонус к очкам." />
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/games')}>
          ←
        </button>
        <h1 className={styles.headerTitle}>Факт или миф</h1>
        <span className={styles.counter}>
          {round + 1}/{ROUNDS}
        </span>
      </div>
      {phase === 'ready' && (
        <div className={snapStyles.intro}>
          <p className={snapStyles.introText}>
            {ROUNDS} утверждений. Чем раньше нажмёшь «Верно» или «Неверно», тем выше бонус к очкам.
          </p>
          <button type="button" className={styles.primaryBtn} onClick={() => setPhase('play')}>
            Начать
          </button>
        </div>
      )}
      {phase === 'play' && (
        <div className={snapStyles.play}>
          <div className={snapStyles.timerTrack}>
            <div className={snapStyles.timerFill} style={{ width: `${progress * 100}%` }} />
          </div>
          <p className={snapStyles.statement}>{current.statement}</p>
          <div className={snapStyles.btns}>
            <button type="button" className={`${snapStyles.choice} ${snapStyles.yes}`} onClick={() => answer(true)}>
              Верно
            </button>
            <button type="button" className={`${snapStyles.choice} ${snapStyles.no}`} onClick={() => answer(false)}>
              Неверно
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
