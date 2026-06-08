import { useRef, useState } from 'react';
import {
  CeriousScroll,
  type CeriousScrollHandle,
} from '@ceriousdevtech/react-cerious-scroll';

import {
  TABLE_COLUMNS,
  TABLE_TOTAL,
  makeRow,
  statusLabel,
} from './table.data';
import './table.css';

export function TableDemo() {
  const ref = useRef<CeriousScrollHandle>(null);
  const [total, setTotal] = useState(TABLE_TOTAL);

  return (
    <div className="demo-page cs-table-page">
      <div className="demo-page__header">
        <h1>🧮 Native &lt;table&gt; mode</h1>
        <p>
          Real <code>&lt;tr&gt;</code>/<code>&lt;td&gt;</code> rows via{' '}
          <code>layout: 'table'</code> — frozen header, aligned columns, single
          tbody transform. Virtualizes {total.toLocaleString()} rows with ~25 in the DOM.
        </p>
      </div>

      <div className="demo-toolbar">
        <label>
          Rows:{' '}
          <select value={total} onChange={(e) => setTotal(parseInt(e.target.value, 10))}>
            <option value={1000}>1,000</option>
            <option value={100000}>100,000</option>
            <option value={1000000}>1,000,000</option>
          </select>
        </label>
        <button type="button" onClick={() => ref.current?.scrollToPercentage(0)}>Top</button>
        <button type="button" onClick={() => ref.current?.scrollToPercentage(100)}>End</button>
        <span className="stat">
          <strong>{total.toLocaleString()}</strong> rows
        </span>
      </div>

      <CeriousScroll
        ref={ref}
        className="demo-scroll cs-table-scroll"
        totalElements={total}
        getItem={(i) => i}
        // The header lives in the engine's <thead> (declarative, same table as the
        // rows → native column alignment). autoSizeColumns measures widths once
        // then pins them: auto-sized but stable, no manual widths.
        options={{ layout: 'table', table: { tableClassName: 'cs-table', autoSizeColumns: true } }}
        tableHeader={
          <tr>
            {TABLE_COLUMNS.map((c) => (
              <th key={c.key} className={c.cls}>{c.label}</th>
            ))}
          </tr>
        }
        renderItem={(index: number) => {
          const row = makeRow(index);
          return (
            <>
              <td className="cell-id">{row.id}</td>
              <td className="cell-name">{row.name}</td>
              <td>
                <span className={`badge badge--${row.status}`}>{statusLabel(row.status)}</span>
              </td>
              <td>{row.email}</td>
              <td className="num">{row.score.toLocaleString()}</td>
            </>
          );
        }}
      />

      <div className="demo-footer">
        <span>
          Total: <strong>{total.toLocaleString()}</strong>
        </span>
        <span>
          Mode: <strong>layout: 'table'</strong>
        </span>
      </div>
    </div>
  );
}
