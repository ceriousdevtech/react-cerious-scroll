import { useMemo, useRef, useState } from 'react';
import {
  CeriousScroll,
  type CeriousScrollHandle,
  type CeriousScrollOptions,
} from '@ceriousdevtech/react-cerious-scroll';

import { rand } from '../lib/random';
import './masonry.css';

const ITEM_COUNTS = [1_000, 50_000, 200_000, 1_000_000] as const;
const RATIOS = [3 / 4, 4 / 3, 1, 9 / 16, 16 / 9, 2 / 3] as const;

function heightFor(index: number, columnWidth: number): number {
  const ratio = RATIOS[Math.floor(rand(index, 1) * RATIOS.length)];
  return Math.round(columnWidth / ratio) + 44;
}

export function MasonryDemo() {
  const ref = useRef<CeriousScrollHandle>(null);
  const [total, setTotal] = useState(200_000);
  const [jump, setJump] = useState('123456');
  const [stat, setStat] = useState('scroll to see live stats');
  const options = useMemo<CeriousScrollOptions>(() => ({
    layout: 'masonry',
    wheel: { smooth: true, notchThresholdPx: Infinity },
    masonry: {
      getItemHeight: heightFor,
      gap: 14,
      targetColumnWidth: 260,
      segmentSize: 500,
    },
  }), []);

  const refreshStat = () => {
    const scroller = ref.current?.scroller;
    if (scroller) {
      setStat(`${scroller.scrollPercentage.toFixed(1)}% through the card dataset`);
    }
  };

  const go = () => {
    const index = Number.parseInt(jump, 10);
    if (Number.isFinite(index)) ref.current?.jumpToItem(Math.max(0, Math.min(total - 1, index)));
    refreshStat();
  };

  return (
    <div className="demo-page">
      <div className="demo-page__header">
        <h1>🧱 Masonry · canonical heights</h1>
        <p>React cards flow into the shortest responsive column from a pure height oracle — reproducible positions with a bounded DOM.</p>
      </div>
      <div className="demo-toolbar">
        <label htmlFor="masonry-items">Items</label>
        <select id="masonry-items" value={total} onChange={(event) => setTotal(Number(event.target.value))}>
          {ITEM_COUNTS.map((count) => <option key={count} value={count}>{count.toLocaleString()}</option>)}
        </select>
        <input value={jump} type="number" onChange={(event) => setJump(event.target.value)} />
        <button type="button" onClick={go}>Go</button>
        <button type="button" onClick={() => { ref.current?.scrollToPercentage(0); refreshStat(); }}>Top</button>
        <button type="button" onClick={() => { ref.current?.scrollToPercentage(100); refreshStat(); }}>End</button>
        <span className="spacer" />
        <span className="stat">{stat}</span>
      </div>
      <CeriousScroll
        ref={ref}
        className="demo-scroll masonry-scroll"
        totalElements={total}
        getItem={(index) => index}
        options={options}
        onMeasuredViewport={refreshStat}
        renderItem={(index) => {
          const hue = Math.floor(rand(index, 2) * 360);
          return (
            <div className="masonry-card masonry-card--media">
              <span className="masonry-card__fill" style={{ background: `linear-gradient(160deg,hsl(${hue} 62% 58%),hsl(${(hue + 38) % 360} 62% 44%))` }} />
              <span className="masonry-card__label">React · {index.toLocaleString()}</span>
            </div>
          );
        }}
      />
      <div className="demo-footer"><span>Total: <strong>{total.toLocaleString()}</strong></span><span>Determinism: <strong>canonical</strong></span></div>
    </div>
  );
}
