import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { dictionaryApi } from '../../api/endpoints';
import { useApp } from '../../store/AppContext';
import styles from './GuessRiskGame.module.css';
import canvasStyles from './CanvasGames.module.css';
import type { DictionaryTerm } from '../../types';
import InstructionBadge from './InstructionBadge';

type Card = {
  id: string;
  text: string;
  pairKey: string;
  side: 'term' | 'def';
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MemoryTermsGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);
  const savedRef = useRef(false);
  const lockRef = useRef(false);

  useEffect(() => {
    let dead = false;
    dictionaryApi
      .getTerms()
      .then((terms: DictionaryTerm[]) => {
        if (dead) return;
        const pick = shuffle(terms).slice(0, 6);
        const deck: Card[] = [];
        pick.forEach((t) => {
          const key = t.id;
          deck.push({ id: `${key}-t`, text: t.term, pairKey: key, side: 'term' });
          deck.push({
            id: `${key}-d`,
            text: t.definition.length > 120 ? `${t.definition.slice(0, 117)}...` : t.definition,
            pairKey: key,
            side: 'def',
          });
        });
        setCards(shuffle(deck));
      })
      .catch(() => setCards([]))
      .finally(() => {
        if (!dead) setLoading(false);
      });
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    if (!cards.length || matched.size < cards.length || finished) return;
    setFinished(true);
  }, [matched, cards.length, finished]);

  useEffect(() => {
    if (!finished || savedRef.current) return;
    const score = Math.max(0, 100 - moves * 2);
    savedRef.current = true;
    void actions.saveGameResult('memory-terms', score);
  }, [finished, moves, actions]);

  const onCardClick = (card: Card) => {
    if (lockRef.current || matched.has(card.id) || flipped.includes(card.id)) return;
    const next = [...flipped, card.id];
    setFlipped(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    lockRef.current = true;
    const [a, b] = next.map((id) => cards.find((c) => c.id === id)!);
    if (a.pairKey === b.pairKey && a.side !== b.side) {
      setMatched((prev) => new Set([...prev, a.id, b.id]));
      setFlipped([]);
      lockRef.current = false;
    } else {
      setTimeout(() => {
        setFlipped([]);
        lockRef.current = false;
      }, 700);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={canvasStyles.hint}>Загрузка терминов…</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className={styles.page}>
        <p className={canvasStyles.hint}>Не удалось загрузить словарь.</p>
        <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/games')}>
          Назад
        </button>
      </div>
    );
  }

  if (finished) {
    const score = Math.max(0, 100 - moves * 2);
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <div className={styles.resultIcon}>✓</div>
          <h2 className={styles.resultTitle}>Все пары найдены!</h2>
          <p className={styles.resultScore}>{score}</p>
          <p className={styles.resultPercent}>очков · ходов: {moves}</p>
          <div className={styles.resultActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => {
                savedRef.current = false;
                setFinished(false);
                setMatched(new Set());
                setFlipped([]);
                setMoves(0);
                setCards((c) => shuffle(c));
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
      <InstructionBadge text="Открывай карточки и находи пары: термин + его определение. Меньше ходов — выше счет." />
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/games')}>
          ←
        </button>
        <h1 className={styles.headerTitle}>Память терминов</h1>
        <span className={styles.counter}>{moves} ходов</span>
      </div>
      <p className={canvasStyles.hint}>Найди пары: термин и его определение. Карточки одинакового размера.</p>
      <div className={canvasStyles.memoryGrid}>
        {cards.map((c) => {
          const isOpen = flipped.includes(c.id) || matched.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={`${canvasStyles.memoryCard} ${isOpen ? canvasStyles.flipped : ''} ${
                matched.has(c.id) ? canvasStyles.matched : ''
              }`}
              onClick={() => onCardClick(c)}
              disabled={matched.has(c.id)}
            >
              {isOpen ? <span className={canvasStyles.memoryText}>{c.text}</span> : <span className={canvasStyles.memoryMask}>?</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
