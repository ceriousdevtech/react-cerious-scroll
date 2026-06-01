import { useEffect, useRef, useState } from 'react';

/**
 * Live frame-rate meter. Measures the *true* paint cadence with a
 * `requestAnimationFrame` loop: when the main thread is busy (e.g. a heavy
 * scroll render) frame callbacks are delayed and the number drops, so this
 * reflects how smoothly the scroller is actually running.
 */
export function FpsMeter() {
  const [fps, setFps] = useState(0);
  const elRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();

    const loop = (now: number) => {
      frames++;
      const elapsed = now - last;
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tier = fps >= 55 ? 'good' : fps >= 30 ? 'ok' : 'bad';
  return (
    <span ref={elRef} className={`fps-meter fps-meter--${tier}`} title="Live frames per second">
      <span className="fps-meter__value">{fps}</span>
      <span className="fps-meter__unit">FPS</span>
    </span>
  );
}
