import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './GuessRiskGame.module.css';
import battleStyles from './QuizBattleGame.module.css';
import InstructionBadge from './InstructionBadge';

type Q = { q: string; options: string[]; correct: number; tip: string };

const QUESTIONS: Q[] = [
  { q: 'Что обязательно для авто на дорогах?', options: ['ОСАГО', 'КАСКО', 'ДМС'], correct: 0, tip: 'Это базовый обязательный полис.' },
  { q: 'Франшиза — это...', options: ['Часть убытка клиента', 'Налог', 'Штраф банка'], correct: 0, tip: 'Часть расходов оплачивает сам клиент.' },
  { q: 'Что делать после ДТП первым?', options: ['Зафиксировать и сообщить', 'Сразу ремонт', 'Игнорировать'], correct: 0, tip: 'Сначала фиксация и уведомление.' },
  { q: 'КАСКО обычно защищает от...', options: ['Угона и повреждений', 'Только штрафов', 'Только ТО'], correct: 0, tip: 'Покрывает широкий круг рисков авто.' },
  { q: 'Страховой случай это...', options: ['Событие из договора', 'Любая поломка', 'Платеж в банк'], correct: 0, tip: 'Только то, что явно указано в полисе.' },
  { q: 'Кто получает выплату?', options: ['Выгодоприобретатель', 'Любой сосед', 'Сотрудник банка'], correct: 0, tip: 'Назначается в договоре.' },
];

export default function QuizBattleGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [playerPts, setPlayerPts] = useState(0);
  const [botPts, setBotPts] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUESTIONS[idx];
  const rounds = QUESTIONS.length;
  const lastRoundCorrect = picked !== null && picked === q.correct;

  const status = useMemo(() => {
    if (playerPts > botPts) return 'Ты лидируешь';
    if (playerPts < botPts) return 'Бот впереди';
    return 'Равный счет';
  }, [playerPts, botPts]);

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);

    const playerOk = i === q.correct;
    const botSkill = 0.62 + idx * 0.04;
    const botOk = Math.random() < Math.min(0.9, botSkill);

    if (playerOk) setPlayerPts((v) => v + 1);
    if (botOk) setBotPts((v) => v + 1);
  };

  const next = async () => {
    if (idx + 1 >= rounds) {
      setDone(true);
      const score = playerPts * 22 + (playerPts >= botPts ? 30 : 8);
      await actions.saveGameResult('quiz-battle', score);
      return;
    }
    setIdx((v) => v + 1);
    setPicked(null);
  };

  if (done) {
    const won = playerPts >= botPts;
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <h2 className={styles.resultTitle}>{won ? 'Победа в дуэли' : 'Бот выиграл'}</h2>
          <p className={styles.resultScore}>{playerPts}:{botPts}</p>
          <p className={styles.resultPercent}>правильных ответов</p>
          <div className={styles.resultActions}>
            <button type="button" className={styles.primaryBtn} onClick={() => { setDone(false); setIdx(0); setPicked(null); setPlayerPts(0); setBotPts(0); }}>
              Реванш
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
      <InstructionBadge text="Выбери правильный ответ раньше бота. Побеждает тот, у кого больше верных ответов." />
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/games')}>←</button>
        <h1 className={styles.headerTitle}>Баттл с ботом</h1>
        <span className={styles.counter}>{idx + 1}/{rounds}</span>
      </div>

      <div className={battleStyles.scoreRow}>
        <div className={battleStyles.scoreCard}><span>Ты</span><strong>{playerPts}</strong></div>
        <div className={battleStyles.scoreCard}><span>Бот</span><strong>{botPts}</strong></div>
      </div>
      <p className={battleStyles.status}>{status}</p>

      <div className={styles.content}>
        <div className={styles.situationCard}>
          <p className={styles.situationText}>{q.q}</p>
        </div>

        <div className={styles.optionsList}>
          {q.options.map((o, i) => {
            let cls = styles.optionBtn;
            if (picked !== null) {
              if (i === q.correct) cls += ` ${styles.correct}`;
              else if (i === picked) cls += ` ${styles.incorrect}`;
              else cls += ` ${styles.dimmed}`;
            }
            const showOk = picked !== null && i === q.correct;
            const showBad = picked !== null && i === picked && i !== q.correct;
            return (
              <button key={o} type="button" className={cls} onClick={() => choose(i)} disabled={picked !== null}>
                <span className={styles.optionText}>{o}</span>
                {showOk && <span className={styles.optionMarkOk}>Верно</span>}
                {showBad && <span className={styles.optionMarkBad}>Неверно</span>}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div
            className={`${styles.explanationCard} ${lastRoundCorrect ? styles.explanationCardSuccess : styles.explanationCardError}`}
          >
            <div className={styles.feedbackRibbon}>{lastRoundCorrect ? 'Верно' : 'Неверно'}</div>
            <div className={styles.explanationCardBody}>
              <p className={styles.explanationText}>{q.tip}</p>
              <button type="button" className={styles.nextBtn} onClick={() => void next()}>
                {idx + 1 >= rounds ? 'Завершить дуэль' : 'Следующий раунд'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
