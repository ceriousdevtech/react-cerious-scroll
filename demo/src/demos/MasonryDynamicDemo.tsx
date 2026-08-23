import { useMemo, useRef, useState } from 'react';
import {
  CeriousScroll,
  type CeriousScrollHandle,
  type CeriousScrollOptions,
} from '@ceriousdevtech/react-cerious-scroll';

import { rand, randInt } from '../lib/random';
import './masonry.css';

const ITEM_COUNTS = [1_000, 50_000, 200_000, 1_000_000] as const;
const WORDS = 'virtual scroll masonry column height measure viewport segment frontier anchor gutter card render engine layout dataset pixel budget cache'.split(' ');

function text(index: number, count: number): string {
  return Array.from({ length: count }, (_, offset) => WORDS[Math.floor(rand(index * 31 + offset, 11) * WORDS.length)]).join(' ');
}

export function MasonryDynamicDemo() {
  const ref = useRef<CeriousScrollHandle>(null);
  const [total, setTotal] = useState(50_000);
  const [jump, setJump] = useState('25000');
  const options = useMemo<CeriousScrollOptions>(() => ({
    layout: 'masonry',
    wheel: { smooth: true, notchThresholdPx: Infinity },
    masonry: { estimatedItemHeight: 260, gap: 14, targetColumnWidth: 300 },
  }), []);

  const go = () => {
    const index = Number.parseInt(jump, 10);
    if (Number.isFinite(index)) ref.current?.jumpToItem(Math.max(0, Math.min(total - 1, index)));
  };

  return (
    <div className="demo-page">
      <div className="demo-page__header">
        <h1>🪜 Masonry · dynamic heights</h1>
        <p>No height oracle: React renders each uncached card into the measurement probe, then the core places it using its exact DOM height.</p>
      </div>
      <div className="demo-toolbar">
        <label htmlFor="masonry-dynamic-items">Items</label>
        <select id="masonry-dynamic-items" value={total} onChange={(event) => setTotal(Number(event.target.value))}>
          {ITEM_COUNTS.map((count) => <option key={count} value={count}>{count.toLocaleString()}</option>)}
        </select>
        <input value={jump} type="number" onChange={(event) => setJump(event.target.value)} />
        <button type="button" onClick={go}>Go</button>
        <button type="button" onClick={() => ref.current?.scrollToPercentage(0)}>Top</button>
        <button type="button" onClick={() => ref.current?.scrollToPercentage(100)}>End</button>
      </div>
      <CeriousScroll
        ref={ref}
        className="demo-scroll masonry-scroll"
        totalElements={total}
        getItem={(index) => index}
        options={options}
        renderItem={(index) => {
          const words = [5, 14, 32, 58][index % 4];
          const band = index % 7 === 0 ? randInt(index, 50, 230, 8) : 0;
          const hue = Math.floor(rand(index, 9) * 360);
          return (
            <article className="masonry-card masonry-card--dynamic">
              <div className="masonry-card__kind"><span className="masonry-card__id">{index.toLocaleString()}</span>React card</div>
              <p>{text(index, words)}</p>
              {band > 0 && <div className="masonry-card__band" style={{ height: band, background: `linear-gradient(160deg,hsl(${hue} 60% 55%),hsl(${(hue + 40) % 360} 60% 42%))` }} />}
            </article>
          );
        }}
      />
      <div className="demo-footer"><span>Total: <strong>{total.toLocaleString()}</strong></span><span>Determinism: <strong>local</strong></span></div>
    </div>
  );
}
