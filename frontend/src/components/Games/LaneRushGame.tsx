import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './GuessRiskGame.module.css';
import InstructionBadge from './InstructionBadge';

type Verdict = 'covered' | 'deny' | 'review';

type CaseItem = {
  id: string;
  title: string;
  context: string;
  right: Verdict;
  reason: string;
};

const CASES: CaseItem[] = [
  {
    id: 'c1',
    title: 'ДТП на парковке, ОСАГО активно',
    context: 'Есть фото, европротокол и второй участник.',
    right: 'covered',
    reason: 'Условия покрытия соблюдены, это типичный страховой случай по ОСАГО.',
  },
  {
    id: 'c2',
    title: 'Затопление квартиры, полис истек 5 дней назад',
    context: 'Дата события позже окончания срока полиса.',
    right: 'deny',
    reason: 'Событие произошло вне срока действия договора.',
  },
  {
    id: 'c3',
    title: 'Угон авто, КАСКО есть, но ключей нет',
    context: 'Ключи не переданы, детали противоречивы.',
    right: 'review',
    reason: 'Нужна доп.проверка: возможны основания для отказа, но решение не мгновенное.',
  },
  {
    id: 'c4',
    title: 'Перелом в поездке, полис путешественника активен',
    context: 'Обращение в партнерскую клинику и подтверждение диагноза.',
    right: 'covered',
    reason: 'Кейс соответствует покрываемому риску и подтвержден документами.',
  },
  {
    id: 'c5',
    title: 'Пожар на даче из-за умышленного поджога владельцем',
    context: 'Есть заключение о намеренных действиях.',
    right: 'deny',
    reason: 'Умышленные действия страхователя исключаются из покрытия.',
  },
  {
    id: 'c6',
    title: 'Кража велосипеда из подъезда',
    context: 'Есть полис имущества, но неизвестно, входил ли велосипед в перечень.',
    right: 'review',
    reason: 'Сначала сверка условий и перечня застрахованного имущества.',
  },
];

const VERDICTS: { key: Verdict; label: string }[] = [
  { key: 'covered', label: 'Покрывается' },
  { key: 'deny', label: 'Отказ' },
  { key: 'review', label: 'Проверка' },
];

export default function LaneRushGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [answers, setAnswers] = useState<Record<string, Verdict>>({});
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    const correct = CASES.reduce((acc, item) => acc + (answers[item.id] === item.right ? 1 : 0), 0);
    const percent = Math.round((correct / CASES.length) * 100);
    return { correct, percent, score: correct * 24 };
  }, [answers]);

  const onSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    await actions.saveGameResult('lane-rush', result.score, { mode: 'logic-verdict' });
  };

  const onReset = () => {
    setSubmitted(false);
    setAnswers({});
  };

  return (
    <div className={styles.page}>
      <InstructionBadge text="Для каждого кейса выбери вердикт: покрывается, отказ или проверка. Затем проверь результат." />
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/games')}>
          ←
        </button>
        <h1 className={styles.headerTitle}>Логика выплат</h1>
        <span className={styles.counter}>{Object.keys(answers).length}/{CASES.length}</span>
      </div>

      {!submitted ? (
        <div className={styles.content}>
          <div className={styles.situationCard}>
            <p className={styles.situationText}>
              Нажимай по вариантам решения для каждого кейса: покрывается, отказ или нужна проверка.
            </p>
          </div>

          <div className={styles.optionsList}>
            {CASES.map((item) => (
              <div key={item.id} className={`${styles.optionBtn} ${styles.optionBtnStack}`} style={{ cursor: 'default' }}>
                <div style={{ marginBottom: 6, fontWeight: 700 }}>{item.title}</div>
                <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)' }}>{item.context}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {VERDICTS.map((v) => {
                    const active = answers[item.id] === v.key;
                    return (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: v.key }))}
                        className={active ? styles.correct : ''}
                        style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--gray-300)' }}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.nextBtn}
            onClick={() => void onSubmit()}
            disabled={Object.keys(answers).length !== CASES.length}
          >
            Проверить решения
          </button>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.resultSection}>
            <h2 className={styles.resultTitle}>Результат</h2>
            <p className={styles.resultScore}>{result.correct}/{CASES.length}</p>
            <p className={styles.resultPercent}>{result.percent}% точности</p>
            <div className={styles.resultActions}>
              <button type="button" className={styles.primaryBtn} onClick={onReset}>Решить заново</button>
              <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/games')}>К играм</button>
            </div>
          </div>

          <div className={styles.optionsList}>
            {CASES.map((item) => {
              const ok = answers[item.id] === item.right;
              return (
                <div key={item.id} className={`${styles.optionBtn} ${styles.optionBtnStack} ${ok ? styles.correct : styles.incorrect}`} style={{ cursor: 'default' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 13 }}>Твой ответ: {VERDICTS.find((v) => v.key === answers[item.id])?.label || '-'}</div>
                  <div style={{ fontSize: 13 }}>Верно: {VERDICTS.find((v) => v.key === item.right)?.label}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>{item.reason}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
