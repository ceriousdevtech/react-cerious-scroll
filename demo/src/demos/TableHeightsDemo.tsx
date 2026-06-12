import { useRef, useState } from 'react';
import {
  CeriousScroll,
  type CeriousScrollHandle,
} from '@ceriousdevtech/react-cerious-scroll';

import {
  HEIGHTS_COLUMNS,
  HEIGHTS_COLUMN_WIDTHS,
  HEIGHTS_TOTAL,
  makeHeightsRow,
  type HeightsRow,
} from './table-heights.data';
import './table-heights.css';

/** Render the variable-height CONTENT cell for a row, per its kind. */
function BodyCell({ row }: { row: HeightsRow }) {
  switch (row.kind) {
    case 'line':
      return <p className="body-text">{row.paragraphs[0]}</p>;
    case 'para':
    case 'wall':
      return (
        <>
          <p className="body-title">{row.title}</p>
          {row.paragraphs.map((p, i) => (
            <p className="body-text" key={i}>{p}</p>
          ))}
        </>
      );
    case 'list':
      return (
        <>
          <p className="body-title">{row.title}</p>
          <ul className="body-list">
            {row.listItems.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </>
      );
    case 'code':
      return (
        <>
          <p className="body-title">{row.title}</p>
          <pre className="body-code">{row.codeLines.join('\n')}</pre>
        </>
      );
    case 'banner':
      return (
        <div
          className="body-banner"
          style={{
            height: row.bannerPx,
            background: row.bannerColor.bg,
            borderColor: row.bannerColor.bd,
            color: row.bannerColor.fg,
          }}
        >
          {row.bannerText}
        </div>
      );
    case 'tags':
      return (
        <>
          <p className="body-title">{row.title}</p>
          <div className="body-tags">
            {row.tags.map((t, i) => <span className="body-tag" key={i}>#{t}</span>)}
          </div>
        </>
      );
  }
}

export function TableHeightsDemo() {
  const ref = useRef<CeriousScrollHandle>(null);
  const [total, setTotal] = useState(HEIGHTS_TOTAL);
  const [jump, setJump] = useState(5000);

  return (
    <div className="demo-page cs-heights-page">
      <div className="demo-page__header">
        <h1>🪜 Native &lt;table&gt; · wild dynamic heights</h1>
        <p>
          Real <code>&lt;tr&gt;</code>/<code>&lt;td&gt;</code> rows via <code>layout: 'table'</code>, but
          every row has a <strong>different, unpredictable height</strong> — one-liners next to walls of
          text, long lists, code blocks, tall banners and wrapping tag clouds. Each row is{' '}
          <em>measured</em>, so the single &lt;tbody&gt; transform stays pixel-correct.
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
        <span>
          Jump to{' '}
          <input
            type="number"
            min={0}
            value={jump}
            style={{ width: 90 }}
            onChange={(e) => setJump(parseInt(e.target.value, 10) || 0)}
          />
          <button type="button" onClick={() => ref.current?.jumpToElement(jump)}>Go</button>
        </span>
        <button type="button" onClick={() => ref.current?.scrollToPercentage(0)}>Top</button>
        <button type="button" onClick={() => ref.current?.scrollToPercentage(100)}>End</button>
        <span className="stat"><strong>{total.toLocaleString()}</strong> rows</span>
      </div>

      <CeriousScroll
        ref={ref}
        className="demo-scroll cs-table-scroll"
        totalElements={total}
        getItem={(i) => i}
        options={{ layout: 'table', table: { tableClassName: 'cs-table', columnWidths: [...HEIGHTS_COLUMN_WIDTHS] } }}
        tableHeader={
          <tr>
            {HEIGHTS_COLUMNS.map((c) => (
              <th key={c.key} className={c.cls}>{c.label}</th>
            ))}
          </tr>
        }
        renderItem={(index: number) => {
          const row = makeHeightsRow(index);
          return (
            <>
              <td className="col-id"><span className="cell-id">{row.id}</span></td>
              <td className="col-kind"><span className={`kind-badge ${row.kindCls}`}>{row.kindLabel}</span></td>
              <td className="col-body"><BodyCell row={row} /></td>
              <td className="col-meta">
                <span className="meta-row"><span className="meta-k">@</span><span className="meta-v">{row.owner}</span></span>
                <span className="meta-row"><span className="meta-k">v</span><span className="meta-v">{row.version}</span></span>
              </td>
            </>
          );
        }}
      />

      <div className="demo-footer">
        <span>Total: <strong>{total.toLocaleString()}</strong></span>
        <span>Mode: <strong>layout: 'table'</strong></span>
        <span>Heights: <strong>measured per row</strong></span>
      </div>
    </div>
  );
}
