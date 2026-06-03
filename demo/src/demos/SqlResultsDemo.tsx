import { useRef, useState } from 'react';
import { CeriousScroll } from '@ceriousdevtech/react-cerious-scroll';

import { makeResult, SQL_COLUMNS, SQL_TOTAL, sqlStatusClass } from './sql.data';
import './sql.css';

export function SqlResultsDemo() {
  const [selected, setSelected] = useState<number | null>(null);
  const hScrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="demo-page sql-page">
      <div className="demo-page__header">
        <h1>🗄️ SQL Results</h1>
        <p>{SQL_TOTAL.toLocaleString()} rows returned — click a row to select it.</p>
      </div>

      <pre className="sql-editor">
        <span className="kw">SELECT</span> id, customer, product, amount, status, created_at{'\n'}
        <span className="kw">FROM</span>   orders{'\n'}
        <span className="kw">WHERE</span>  amount {'>'} 0{'\n'}
        <span className="kw">ORDER BY</span> created_at <span className="kw">DESC</span>;
      </pre>

      <div className="demo-toolbar">
        <span className="stat">
          ✓ <strong>{SQL_TOTAL.toLocaleString()}</strong> rows · 0.024s
        </span>
        <span className="spacer" />
        <span className="stat">
          Selected row: <strong>{selected === null ? '—' : makeResult(selected).id}</strong>
        </span>
      </div>

      <CeriousScroll
        className="demo-scroll sql-scroll"
        totalElements={SQL_TOTAL}
        getItem={(i) => i}
        options={{ touch: { enabled: true, getHorizontalScrollTarget: () => hScrollRef.current } }}
        renderItem={(i) => {
          const r = makeResult(i);
          return (
            <div
              className={`sql-row${selected === i ? ' selected' : ''}`}
              onClick={() => setSelected(i)}
            >
              <div className="sql-cell id">{r.id}</div>
              <div className="sql-cell">{r.customer}</div>
              <div className="sql-cell">{r.product}</div>
              <div className="sql-cell num">${r.amount.toLocaleString()}</div>
              <div className="sql-cell">
                <span className={`sql-badge ${sqlStatusClass(r.status)}`}>{r.status}</span>
              </div>
              <div className="sql-cell">{r.date}</div>
            </div>
          );
        }}
      >
        <div className="sql-h-scroll" ref={hScrollRef}>
          <div className="sql-head">
            {SQL_COLUMNS.map((c) => (
              <div key={c} className="sql-head__cell">
                {c}
              </div>
            ))}
          </div>
          <div data-cerious-scroll-content className="sql-scroll-content" />
        </div>
      </CeriousScroll>
    </div>
  );
}
