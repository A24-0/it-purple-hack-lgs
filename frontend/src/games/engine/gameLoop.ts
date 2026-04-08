export type GameLoopHandlers = {
  update: (dtSeconds: number) => void;
  draw: () => void;
};

export function startGameLoop(handlers: GameLoopHandlers): () => void {
  let raf = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    handlers.update(dt);
    handlers.draw();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
