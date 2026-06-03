import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CeriousScroll,
  type CeriousScrollHandle,
} from '@ceriousdevtech/react-cerious-scroll';

import {
  buildOrder,
  GRID_COLUMNS,
  makeRow,
  statusClass,
  type GridColumn,
  type SortDir,
} from './data-grid.data';
import './data-grid.css';

export function DataGridDemo() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sortCol, setSortCol] = useState<GridColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());

  const ref = useRef<CeriousScrollHandle>(null);
  const hScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(id);
  }, [query]);

  const order = useMemo(
    () => buildOrder(debounced, sortCol, sortDir),
    [debounced, sortCol, sortDir],
  );

  // Reset to the top whenever the visible set changes.
  useEffect(() => {
    ref.current?.jumpToElement(0);
  }, [order]);

  const toggleSort = (col: GridColumn) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const clickRow = (src: number, additive: boolean) => {
    setSelected((prev) => {
      const next = new Set(additive ? prev : []);
      if (prev.has(src) && (additive || prev.size === 1)) next.delete(src);
      else next.add(src);
      return next;
    });
  };

  return (
    <div className="demo-page grid-page">
      <div className="demo-page__header">
        <h1>📊 Enterprise Data Grid</h1>
        <p>Sort, search, and multi-select across {order.length.toLocaleString()} of 100,000 records.</p>
      </div>

      <div className="demo-toolbar">
        <input
          type="search"
          placeholder="Search id, name, email, department…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <button type="button" onClick={() => alert(`Exporting ${selected.size || order.length} rows…`)}>
          📥 Export
        </button>
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setSortCol(null);
            setSelected(new Set());
          }}
        >
          🔄 Reset
        </button>
        <span className="stat">
          <strong>{order.length.toLocaleString()}</strong> rows
        </span>
      </div>

      <CeriousScroll
        ref={ref}
        className="demo-scroll grid-scroll"
        items={order}
        options={{ touch: { enabled: true, getHorizontalScrollTarget: () => hScrollRef.current } }}
        renderItem={(src) => {
          const row = makeRow(src);
          const isSel = selected.has(src);
          const revPos = row.revenue >= 0;
          return (
            <div
              className={`grid-row${isSel ? ' selected' : ''}`}
              onClick={(e) => clickRow(src, e.ctrlKey || e.metaKey)}
            >
              <div className="grid-cell rownum">{row.index + 1}</div>
              <div className="grid-cell id">{row.id}</div>
              <div className="grid-cell">{row.name}</div>
              <div className="grid-cell email">{row.email}</div>
              <div className="grid-cell">{row.department}</div>
              <div className="grid-cell">
                <span className={`badge ${statusClass(row.status)}`}>{row.status}</span>
              </div>
              <div className="grid-cell">{row.region}</div>
              <div className={`grid-cell num ${revPos ? 'cell-positive' : 'cell-negative'}`}>
                {revPos ? '+' : '−'}${Math.abs(row.revenue).toLocaleString()}
              </div>
              <div className="grid-cell num">{row.score.toFixed(1)}</div>
              <div className="grid-cell">{row.date}</div>
            </div>
          );
        }}
      >
        <div className="grid-h-scroll" ref={hScrollRef}>
          <div className="grid-head">
            {GRID_COLUMNS.map((c) => (
              <div
                key={c.key}
                className={`grid-head__cell${c.sortable ? ' sortable' : ''}`}
                onClick={c.sortable ? () => toggleSort(c.key) : undefined}
              >
                {c.label}
                {c.sortable && (
                  <span className={`grid-head__sort${sortCol === c.key ? ' active' : ''}`}>
                    {sortCol === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div data-cerious-scroll-content className="grid-scroll-content" />
        </div>
      </CeriousScroll>

      <div className="demo-footer">
        <span>
          Selected: <strong>{selected.size}</strong>
        </span>
        <span>Ctrl/Cmd-click to multi-select · click a header to sort</span>
      </div>
    </div>
  );
}
