import { useRef, useState } from 'react';
import {
  CeriousScroll,
  type CeriousScrollHandle,
  type CeriousViewportChangeDetail,
} from '@ceriousdevtech/react-cerious-scroll';

import { rand } from '../lib/random';
import './basic-demo.css';

type Variation = 'uniform' | 'mixed' | 'variable';

const SIZES = [100, 1_000, 10_000, 100_000, 1_000_000];
const PALETTE = ['#1f6feb', '#238636', '#a371f7', '#db6d28', '#cf222e', '#0969da'];

function heightFor(index: number, variation: Variation): number {
  if (variation === 'uniform') return 44;
  if (variation === 'mixed') return [44, 64, 104][index % 3];
  return 32 + Math.floor(rand(index, 7) * 120); // variable: 32–152px
}

export function BasicDemo() {
  const [total, setTotal] = useState(100_000);
  const [variation, setVariation] = useState<Variation>('mixed');
  const [jumpTo, setJumpTo] = useState('');
  const [viewport, setViewport] = useState<CeriousViewportChangeDetail | null>(null);

  const ref = useRef<CeriousScrollHandle>(null);

  // Changing the height variation restyles every row; the engine's content
  // observer picks up the new heights and reflows on its own — no recalculate.

  const handleJump = () => {
    const i = Number.parseInt(jumpTo, 10);
    if (Number.isFinite(i)) ref.current?.jumpToElement(Math.max(0, Math.min(total - 1, i)));
  };

  return (
    <div className="demo-page">
      <div className="demo-page__header">
        <h1>🧱 Basic virtual scroll</h1>
        <p>Lazy `getItem` data source — no array is allocated, so a million rows costs nothing.</p>
      </div>

      <div className="demo-toolbar">
        <label htmlFor="size">Rows</label>
        <select
          id="size"
          value={total}
          onChange={(e) => setTotal(Number(e.target.value))}
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s.toLocaleString()}
            </option>
          ))}
        </select>

        <label htmlFor="var">Heights</label>
        <select
          id="var"
          value={variation}
          onChange={(e) => setVariation(e.target.value as Variation)}
        >
          <option value="uniform">Uniform (44px)</option>
          <option value="mixed">Mixed (44/64/104px)</option>
          <option value="variable">Variable (32–152px)</option>
        </select>

        <span style={{ display: 'inline-flex', gap: 6 }}>
          <input
            type="number"
            min={0}
            max={total - 1}
            placeholder="row #"
            value={jumpTo}
            onChange={(e) => setJumpTo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJump()}
            style={{ width: 110 }}
          />
          <button type="button" onClick={handleJump}>
            Go
          </button>
          <button type="button" onClick={() => ref.current?.reset()}>
            Top
          </button>
          <button type="button" onClick={() => ref.current?.scrollToPercentage(100)}>
            End
          </button>
        </span>

        <span className="spacer" />
        <span className="stat">
          {viewport
            ? `top row ${viewport.currentElement.toLocaleString()} · ${viewport.percentage.toFixed(1)}%`
            : 'scroll to see live stats'}
        </span>
      </div>

      <CeriousScroll
        ref={ref}
        className="demo-scroll"
        totalElements={total}
        getItem={(index) => index}
        onViewportChange={setViewport}
        renderItem={(index) => {
          const h = heightFor(index, variation);
          const color = PALETTE[index % PALETTE.length];
          return (
            <div className="basic-row" style={{ height: h, borderLeftColor: color }}>
              <span className="basic-row__index">#{index.toLocaleString()}</span>
              <span
                className="basic-row__bar"
                style={{ background: color, width: `${30 + (index % 60)}%` }}
              />
              <span className="basic-row__meta">{h}px</span>
            </div>
          );
        }}
      />

      <div className="demo-footer">
        <span>
          Total: <strong>{total.toLocaleString()}</strong>
        </span>
        <span>
          Mode: <strong>{variation}</strong>
        </span>
      </div>
    </div>
  );
}
