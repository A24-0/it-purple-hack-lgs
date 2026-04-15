import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './GuessRiskGame.module.css';
import InstructionBadge from './InstructionBadge';

type Item = { id: string; text: string; category: 'required' | 'optional' };

const ITEMS: Item[] = [
  { id: '1', text: 'ОСАГО для автомобиля на дороге', category: 'required' },
  { id: '2', text: 'КАСКО от угона', category: 'optional' },
  { id: '3', text: 'Страховка квартиры от залива', category: 'optional' },
  { id: '4', text: 'ОСАГО при продаже авто и снятии с учета', category: 'optional' },
  { id: '5', text: 'Полис путешественника в страны с визой', category: 'required' },
  { id: '6', text: 'ДМС для сотрудника', category: 'optional' },
  { id: '7', text: 'Страхование ипотеки (требование банка)', category: 'required' },
  { id: '8', text: 'Защита телефона от падения', category: 'optional' },
];

export default function InsuranceSorterGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [answers, setAnswers] = useState<Record<string, 'required' | 'optional'>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    return ITEMS.reduce((acc, it) => acc + (answers[it.id] === it.category ? 1 : 0), 0);
  }, [answers]);

  const percent = Math.round((score / ITEMS.length) * 100);

  const onSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    await actions.saveGameResult('insurance-sorter', score * 12);
  };

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <div className={styles.resultIcon}>{percent >= 80 ? 'A' : percent >= 50 ? 'B' : 'C'}</div>
          <h2 className={styles.resultTitle}>Сортировка завершена</h2>
          <p className={styles.resultScore}>
            {score}/{ITEMS.length}
          </p>
          <p className={styles.resultPercent}>{percent}% точности</p>
          <div className={styles.resultActions}>
            <button type="button" className={styles.primaryBtn} onClick={() => { setSubmitted(false); setAnswers({}); }}>
              Еще раз
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
      <InstructionBadge text="Для каждого пункта выбери: обязательно или по желанию. Заполни все пункты и проверь итог." />
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/games')}>
          ←
        </button>
        <h1 className={styles.headerTitle}>Сортировка полисов</h1>
        <span className={styles.counter}>
          {Object.keys(answers).length}/{ITEMS.length}
        </span>
      </div>
      <div className={styles.content}>
        <div className={styles.situationCard}>
          <p className={styles.situationText}>Отметь для каждого пункта: обязательно или по желанию.</p>
        </div>
        <div className={styles.optionsList}>
          {ITEMS.map((it) => (
            <div key={it.id} className={`${styles.optionBtn} ${styles.optionBtnStack}`} style={{ cursor: 'default' }}>
              <div style={{ marginBottom: 10 }}>{it.text}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={answers[it.id] === 'required' ? styles.correct : ''}
                  onClick={() => setAnswers((a) => ({ ...a, [it.id]: 'required' }))}
                  style={{ padding: '8px 12px', borderRadius: 10 }}
                >
                  Обязательно
                </button>
                <button
                  type="button"
                  className={answers[it.id] === 'optional' ? styles.correct : ''}
                  onClick={() => setAnswers((a) => ({ ...a, [it.id]: 'optional' }))}
                  style={{ padding: '8px 12px', borderRadius: 10 }}
                >
                  По желанию
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className={styles.nextBtn} disabled={Object.keys(answers).length !== ITEMS.length} onClick={onSubmit}>
          Завершить
        </button>
      </div>
    </div>
  );
}

