import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './CardDuelGame.module.css';

type Card = {
  id: string;
  title: string;
  attack: number;
  defense: number;
  hint: string;
};

const DECK: Card[] = [
  { id: 'c1', title: 'ОСАГО Базовый', attack: 4, defense: 8, hint: 'Сильная обязательная защита' },
  { id: 'c2', title: 'КАСКО Плюс', attack: 7, defense: 6, hint: 'Гибкая дополнительная защита' },
  { id: 'c3', title: 'Дом Щит', attack: 5, defense: 7, hint: 'Закрывает бытовые риски' },
  { id: 'c4', title: 'Путешествие Safe', attack: 6, defense: 5, hint: 'Лучше в поездках' },
  { id: 'c5', title: 'АнтиФрод', attack: 8, defense: 4, hint: 'Удар по мошенничеству' },
  { id: 'c6', title: 'Семейный План', attack: 5, defense: 6, hint: 'Стабильная универсальная карта' },
];

function randomEnemyCard(excludeId: string): Card {
  const pool = DECK.filter((c) => c.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function CardDuelGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [hpPlayer, setHpPlayer] = useState(30);
  const [hpEnemy, setHpEnemy] = useState(30);
  const [round, setRound] = useState(1);
  const [log, setLog] = useState('Выбери карту для первого хода');
  const [animKey, setAnimKey] = useState(0);
  const [saved, setSaved] = useState(false);

  const isDone = hpPlayer <= 0 || hpEnemy <= 0 || round > 8;
  const won = hpEnemy <= 0 || (round > 8 && hpPlayer >= hpEnemy);
  const score = useMemo(() => Math.max(0, hpPlayer * 3 + (won ? 40 : 10)), [hpPlayer, won]);

  const play = async (card: Card) => {
    if (isDone) return;
    const enemy = randomEnemyCard(card.id);
    const damageToEnemy = Math.max(1, card.attack + Math.floor(Math.random() * 3) - Math.floor(enemy.defense / 3));
    const damageToPlayer = Math.max(1, enemy.attack + Math.floor(Math.random() * 3) - Math.floor(card.defense / 3));
    setHpEnemy((h) => Math.max(0, h - damageToEnemy));
    setHpPlayer((h) => Math.max(0, h - damageToPlayer));
    setRound((r) => r + 1);
    setAnimKey((k) => k + 1);
    setLog(`${card.title}: -${damageToEnemy} сопернику. ${enemy.title}: -${damageToPlayer} тебе.`);
  };

  if (isDone && !saved) {
    setSaved(true);
    void actions.saveGameResult('card-duel', score);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/games')}>
          ←
        </button>
        <h1 className={styles.title}>Карточная дуэль</h1>
        <span className={styles.round}>Раунд {Math.min(round, 8)}/8</span>
      </div>

      <div className={styles.arena} key={animKey}>
        <div className={styles.fighter}>
          <span className={styles.fighterLabel}>Ты</span>
          <div className={styles.hpBar}><div className={styles.hpFill} style={{ width: `${(hpPlayer / 30) * 100}%` }} /></div>
          <strong>{hpPlayer}</strong>
        </div>
        <div className={styles.fighter}>
          <span className={styles.fighterLabel}>Соперник</span>
          <div className={styles.hpBar}><div className={styles.hpFillEnemy} style={{ width: `${(hpEnemy / 30) * 100}%` }} /></div>
          <strong>{hpEnemy}</strong>
        </div>
      </div>

      <p className={styles.log}>{log}</p>

      {!isDone ? (
        <div className={styles.grid}>
          {DECK.map((card) => (
            <button key={card.id} type="button" className={styles.card} onClick={() => void play(card)}>
              <span className={styles.cardTitle}>{card.title}</span>
              <span className={styles.cardStats}>ATK {card.attack} · DEF {card.defense}</span>
              <span className={styles.cardHint}>{card.hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.result}>
          <h2>{won ? 'Победа' : 'Поражение'}</h2>
          <p>{score} очков</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primaryBtn} onClick={() => { setHpPlayer(30); setHpEnemy(30); setRound(1); setSaved(false); setLog('Новый бой начат'); }}>
              Новый бой
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/games')}>
              К играм
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

