import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './GuessRiskGame.module.css';
import InstructionBadge from './InstructionBadge';

type Pack = {
  id: string;
  name: string;
  cost: number;
  auto: number;
  home: number;
  health: number;
  travel: number;
};

const BUDGET = 12;

const PACKS: Pack[] = [
  { id: 'p1', name: 'ОСАГО+', cost: 4, auto: 5, home: 0, health: 0, travel: 0 },
  { id: 'p2', name: 'КАСКО Smart', cost: 5, auto: 7, home: 0, health: 0, travel: 0 },
  { id: 'p3', name: 'Дом Базовый', cost: 3, auto: 0, home: 5, health: 0, travel: 0 },
  { id: 'p4', name: 'Дом Расширенный', cost: 5, auto: 0, home: 8, health: 0, travel: 0 },
  { id: 'p5', name: 'ДМС Старт', cost: 3, auto: 0, home: 0, health: 5, travel: 0 },
  { id: 'p6', name: 'ДМС Плюс', cost: 5, auto: 0, home: 0, health: 8, travel: 0 },
  { id: 'p7', name: 'Travel Basic', cost: 2, auto: 0, home: 0, health: 0, travel: 4 },
  { id: 'p8', name: 'Travel Max', cost: 4, auto: 0, home: 0, health: 0, travel: 7 },
];

const TARGET = { auto: 8, home: 6, health: 6, travel: 4 };

export default function CatchPoliciesGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const metrics = useMemo(() => {
    const chosen = PACKS.filter((p) => selected.includes(p.id));
    const total = chosen.reduce(
      (acc, p) => ({
        cost: acc.cost + p.cost,
        auto: acc.auto + p.auto,
        home: acc.home + p.home,
        health: acc.health + p.health,
        travel: acc.travel + p.travel,
      }),
      { cost: 0, auto: 0, home: 0, health: 0, travel: 0 }
    );

    const scoreRaw =
      Math.min(total.auto, TARGET.auto) +
      Math.min(total.home, TARGET.home) +
      Math.min(total.health, TARGET.health) +
      Math.min(total.travel, TARGET.travel);

    const penalty = total.cost > BUDGET ? (total.cost - BUDGET) * 3 : 0;
    const finalScore = Math.max(0, scoreRaw * 6 - penalty);

    return { ...total, scoreRaw, penalty, finalScore };
  }, [selected]);

  const submit = async () => {
    if (submitted) return;
    setSubmitted(true);
    await actions.saveGameResult('catch-policies', metrics.finalScore, { mode: 'coverage-constructor' });
  };

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const reset = () => {
    setSubmitted(false);
    setSelected([]);
  };

  const Progress = ({ label, value, target }: { label: string; value: number; target: number }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span>{label}</span>
        <span>{value}/{target}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--gray-200)' }}>
        <div
          style={{
            height: 8,
            borderRadius: 999,
            width: `${Math.min(100, Math.round((value / target) * 100))}%`,
            background: 'var(--primary)',
          }}
        />
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <InstructionBadge text="Кликами выбирай пакеты. Закрой целевые риски и уложись в бюджет." />
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/games')}>←</button>
        <h1 className={styles.headerTitle}>Конструктор защиты</h1>
        <span className={styles.counter}>{metrics.cost}/{BUDGET}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.situationCard}>
          <p className={styles.situationText}>
            Собери набор полисов кликами. Цель: закрыть риски семьи и не выйти за бюджет {BUDGET}.
          </p>
          <div style={{ marginTop: 12 }}>
            <Progress label="Авто" value={metrics.auto} target={TARGET.auto} />
            <Progress label="Дом" value={metrics.home} target={TARGET.home} />
            <Progress label="Здоровье" value={metrics.health} target={TARGET.health} />
            <Progress label="Путешествия" value={metrics.travel} target={TARGET.travel} />
          </div>
        </div>

        <div className={styles.optionsList}>
          {PACKS.map((p) => {
            const active = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.optionBtn} ${active ? styles.correct : ''}`}
                onClick={() => toggle(p.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{p.name}</strong>
                  <span>Цена: {p.cost}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  A:{p.auto} · D:{p.home} · H:{p.health} · T:{p.travel}
                </div>
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <button type="button" className={styles.nextBtn} onClick={() => void submit()}>
            Завершить сборку
          </button>
        ) : (
          <div className={styles.resultSection}>
            <h2 className={styles.resultTitle}>Итог сборки</h2>
            <p className={styles.resultScore}>{metrics.finalScore}</p>
            <p className={styles.resultPercent}>
              покрытие: {metrics.scoreRaw} · штраф за бюджет: {metrics.penalty}
            </p>
            <div className={styles.resultActions}>
              <button type="button" className={styles.primaryBtn} onClick={reset}>Собрать заново</button>
              <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/games')}>К играм</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
