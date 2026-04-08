import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { startGameLoop } from '../../games/engine/gameLoop';
import styles from './GuessRiskGame.module.css';
import canvasStyles from './CanvasGames.module.css';

const LANES = 3;
const DURATION = 45;

type Obstacle = { lane: number; y: number; vy: number; boss: boolean; id: number };

export default function PolicyRunnerGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready');
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState('Обычная волна');

  const laneRef = useRef(1);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const nextIdRef = useRef(0);
  const spawnAccRef = useRef(0);
  const elapsedRef = useRef(0);
  const secAccRef = useRef(0);
  const savedRef = useRef(false);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    const laneW = w / LANES;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0b1020');
    grad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 1; i < LANES; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(i * laneW, 0);
      ctx.lineTo(i * laneW, h);
      ctx.stroke();
    }

    const py = h * 0.85;
    const px = (laneRef.current + 0.5) * laneW;
    ctx.fillStyle = '#34d399';
    ctx.fillRect(px - laneW * 0.26, py - 16, laneW * 0.52, 30);
    ctx.fillStyle = '#052e2b';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', px, py + 3);

    for (const ob of obstaclesRef.current) {
      const ox = (ob.lane + 0.5) * laneW;
      const oy = ob.y * h;
      ctx.fillStyle = ob.boss ? '#f97316' : '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(ox, oy - (ob.boss ? 22 : 14));
      ctx.lineTo(ox + (ob.boss ? 18 : 12), oy + 12);
      ctx.lineTo(ox - (ob.boss ? 18 : 12), oy + 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${ob.boss ? 14 : 12}px system-ui`;
      ctx.fillText(ob.boss ? 'B' : '!', ox, oy + 5);
    }
  }, []);

  useEffect(() => {
    if (phase !== 'play') return;

    const stop = startGameLoop({
      update: (dt) => {
        elapsedRef.current += dt;
        secAccRef.current += dt;
        if (secAccRef.current >= 1) {
          secAccRef.current -= 1;
          setTimeLeft((t) => {
            if (t <= 1) {
              setPhase('done');
              return 0;
            }
            return t - 1;
          });
          setScore((s) => s + 2);
        }

        const bossMode = elapsedRef.current > 18 && Math.floor(elapsedRef.current / 9) % 2 === 1;
        setWave(bossMode ? 'Босс-волна' : 'Обычная волна');

        spawnAccRef.current += dt;
        const spawnGap = bossMode ? 0.26 : Math.max(0.42, 0.65 - elapsedRef.current * 0.004);
        if (spawnAccRef.current >= spawnGap) {
          spawnAccRef.current = 0;
          obstaclesRef.current.push({
            lane: Math.floor(Math.random() * LANES),
            y: -0.08,
            vy: (bossMode ? 0.62 : 0.46) + Math.random() * 0.18,
            boss: bossMode && Math.random() > 0.4,
            id: nextIdRef.current++,
          });
        }

        const playerLane = laneRef.current;
        obstaclesRef.current = obstaclesRef.current.filter((o) => {
          o.y += o.vy * dt;
          if (o.y > 0.75 && o.y < 0.92 && o.lane === playerLane) {
            setScore((s) => Math.max(0, s - (o.boss ? 28 : 16)));
            return false;
          }
          return o.y <= 1.06;
        });
      },
      draw,
    });

    return stop;
  }, [phase, draw]);

  useEffect(() => {
    if (phase !== 'done' || savedRef.current) return;
    savedRef.current = true;
    void actions.saveGameResult('policy-runner', score);
  }, [phase, score, actions]);

  const setLane = (v: number) => {
    laneRef.current = Math.max(0, Math.min(LANES - 1, v));
  };

  if (phase === 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <h2 className={styles.resultTitle}>Ран завершен</h2>
          <p className={styles.resultScore}>{score}</p>
          <p className={styles.resultPercent}>очков за дистанцию и уклонения</p>
          <div className={styles.resultActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => {
                savedRef.current = false;
                setScore(0);
                setTimeLeft(DURATION);
                setWave('Обычная волна');
                elapsedRef.current = 0;
                secAccRef.current = 0;
                obstaclesRef.current = [];
                laneRef.current = 1;
                setPhase('ready');
              }}
            >
              Новый ран
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
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/games')}>
          ←
        </button>
        <h1 className={styles.headerTitle}>Policy Runner</h1>
        <span className={styles.counter}>{timeLeft}с · {score}</span>
      </div>
      <p className={canvasStyles.hint}>Лево/центр/право. Каждые несколько секунд сложность растет, затем идет босс-волна.</p>
      <p className={canvasStyles.hint} style={{ marginTop: -8, fontWeight: 700 }}>{wave}</p>
      {phase === 'ready' && (
        <button type="button" className={`${styles.primaryBtn} ${canvasStyles.startBtn}`} onClick={() => setPhase('play')}>
          Старт
        </button>
      )}
      <canvas
        ref={canvasRef}
        width={380}
        height={460}
        className={canvasStyles.canvas}
        style={{ display: phase === 'play' ? 'block' : 'none' }}
        onPointerDown={(e) => {
          if (phase !== 'play') return;
          const r = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          if (x < 1 / 3) setLane(0);
          else if (x < 2 / 3) setLane(1);
          else setLane(2);
        }}
      />
      {phase === 'play' && (
        <div className={canvasStyles.laneBtns}>
          <button type="button" className={canvasStyles.laneBtn} onClick={() => setLane(laneRef.current - 1)}>Лево</button>
          <button type="button" className={canvasStyles.laneBtn} onClick={() => setLane(1)}>Центр</button>
          <button type="button" className={canvasStyles.laneBtn} onClick={() => setLane(laneRef.current + 1)}>Право</button>
        </div>
      )}
    </div>
  );
}
