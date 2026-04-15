import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './RewardsPage.module.css';

const DAILY_XP = 25;
const DAILY_COINS = 8;
const STORAGE_KEY = 'strahogid_last_daily_claim';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function RewardsPage() {
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const [msg, setMsg] = useState('');

  const canClaim = useMemo(() => localStorage.getItem(STORAGE_KEY) !== todayKey(), []);

  const claimDaily = () => {
    if (!canClaim) return;
    actions.earnReward(DAILY_XP, DAILY_COINS);
    localStorage.setItem(STORAGE_KEY, todayKey());
    setMsg(`Готово! +${DAILY_XP} оч. опыта и +${DAILY_COINS} монет`);
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          ←
        </button>
        <h1 className={styles.title}>Награды и задания</h1>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Ежедневный бонус</h2>
        <p className={styles.cardText}>Заходи каждый день и забирай бесплатные награды.</p>
        <button type="button" className={styles.primaryBtn} disabled={!canClaim} onClick={claimDaily}>
          {canClaim ? `Забрать +${DAILY_XP} оч.` : 'Бонус уже получен сегодня'}
        </button>
        {msg && <p className={styles.ok}>{msg}</p>}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Короткие задания</h2>
        <ul className={styles.list}>
          <li>Сыграй в 1 аркаду</li>
          <li>Пройди 1 сценарий</li>
          <li>Ответь верно на 5 вопросов</li>
        </ul>
        <p className={styles.meta}>
          Сейчас: {state.progress.xp} оч. опыта, {state.progress.coins} монет.
        </p>
      </div>
    </div>
  );
}

