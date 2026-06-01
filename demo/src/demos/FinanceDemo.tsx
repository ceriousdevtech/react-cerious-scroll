import { useEffect, useRef, useState } from 'react';
import { CeriousScroll } from '@ceriousdevtech/react-cerious-scroll';

import {
  FIN_TOTAL,
  initialPrices,
  makeStock,
  sparkPoints,
  sparkSeries,
  tickPrices,
} from './finance.data';
import './finance.css';

export function FinanceDemo() {
  const [prices, setPrices] = useState<number[]>(initialPrices);
  const [live, setLive] = useState(true);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    const id = setInterval(() => {
      if (liveRef.current) setPrices((p) => tickPrices(p));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="demo-page">
      <div className="demo-page__header">
        <h1>📈 Live Market Ticker</h1>
        <p>{FIN_TOTAL.toLocaleString()} symbols with streaming prices and sparklines.</p>
      </div>

      <div className="demo-toolbar">
        <button
          type="button"
          className={live ? 'is-active' : ''}
          onClick={() => setLive((v) => !v)}
        >
          {live ? '⏸ Pause stream' : '▶ Resume stream'}
        </button>
        <span className="stat">updates every 1.2s</span>
      </div>

      <CeriousScroll
        className="demo-scroll fin-scroll"
        totalElements={FIN_TOTAL}
        getItem={(i) => i}
        renderItem={(i) => {
          const s = makeStock(i);
          const price = prices[i];
          const changePct = ((price - s.base) / s.base) * 100;
          const up = changePct >= 0;
          return (
            <div className="fin-row">
              <span className="fin-sym">{s.symbol}</span>
              <span className="fin-name">
                {s.name}
                <small>{s.sector}</small>
              </span>
              <svg className="fin-spark" width={110} height={28}>
                <polyline
                  points={sparkPoints(sparkSeries(i), 110, 28)}
                  fill="none"
                  stroke={up ? '#3fb950' : '#f85149'}
                  strokeWidth={1.5}
                />
              </svg>
              <span className="fin-price">${price.toFixed(2)}</span>
              <span className={`fin-change ${up ? 'fin-up' : 'fin-down'}`}>
                {up ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
              </span>
            </div>
          );
        }}
      />
    </div>
  );
}
