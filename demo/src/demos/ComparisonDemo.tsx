/**
 * Side-by-side comparison: react-window (left) vs Cerious Scroll (right).
 *
 * Each scenario applies an identical mutation to both sides via a shared
 * RowDatasource. The competitor (react-window VariableSizeList) caches sizes
 * via its `itemSize` callback and only honors changes after a manual
 * `resetAfterIndex(0)`. We deliberately *don't* call that on every mutation so
 * the breakage is visible — but we do reset on scenario change so the page
 * stays usable.
 *
 * Cerious uses no size cache at all: every measured row reports its real
 * height through ResizeObserver, so changes flow through automatically.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VariableSizeList, type ListChildComponentProps } from 'react-window';
import {
  CeriousScroll,
  type CeriousScrollHandle,
} from '@ceriousdevtech/react-cerious-scroll';

import {
  makeRowDatasource,
  pickIndices,
  chatRowHeight,
  SCENARIOS,
  type CmpRow,
  type Scenario,
} from './comparison.data';
import './comparison.css';

const SIZE_BY_SCENARIO: Record<Scenario, number> = {
  baseline: 10_000,
  'dynamic-height': 10_000,
  expanding: 10_000,
  'async-images': 5_000,
  millions: 5_000_000,
  'continuous-updates': 10_000,
  'chat-markdown': 100_000,
  spreadsheet: 50_000,
};

interface RowProps {
  row: CmpRow;
  onToggle: (id: number) => void;
}

function rowHeight(row: CmpRow): number {
  if (row.isSheet) return row.expanded ? 36 + 240 : 36;
  if (row.isChat) return chatRowHeight(row);
  const base = Math.round(row.baseHeight * row.scale);
  if (row.expanded) return base + 200;
  return row.hasImage ? base + (row.imageLoaded ? 160 : 0) : base;
}

function SheetRowView({ row, onToggle }: RowProps) {
  return (
    <div
      className="cmp-row cmp-row--sheet"
      onClick={() => onToggle(row.id)}
      style={{ height: rowHeight(row) }}
    >
      <div className="sheet-row">
        <div className="sheet-scroll">
          {(row.cells ?? []).map((cell, ci) => (
            <div key={ci} className={`sheet-cell${ci === 0 ? ' sheet-cell--head' : ''}`}>{cell}</div>
          ))}
        </div>
      </div>
      {row.expanded && (
        <div className="sheet-expand">
          Detail panel for R{row.id} — 240px tall. Cerious sees the new height the moment it appears.
        </div>
      )}
    </div>
  );
}

function ChatRowView({ row, onToggle }: RowProps) {
  return (
    <div
      className="cmp-row cmp-row--chat"
      onClick={() => onToggle(row.id)}
      style={{ height: rowHeight(row) }}
    >
      <div className="chat-head">
        <span className="chat-author">@{row.author}</span>
        <span className="chat-ts">{row.ts}</span>
        <span className="chat-edit-hint">{row.editing ? 'editing… (click to save)' : 'click to edit'}</span>
      </div>
      {row.editing ? (
        <textarea
          className="chat-edit"
          defaultValue={(row.lines ?? []).join('\n')}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="chat-body">
          {(row.lines ?? []).map((l, k) => <div key={k} className="chat-line">{l}</div>)}
          {row.hasCode && (
            <pre className="chat-code">{`function greet(name) {\n  return \`hi, \${name}\`;\n}\ngreet('${row.author}');`}</pre>
          )}
        </div>
      )}
    </div>
  );
}

function RowView({ row, onToggle }: RowProps) {
  if (row.isSheet) return <SheetRowView row={row} onToggle={onToggle} />;
  if (row.isChat) return <ChatRowView row={row} onToggle={onToggle} />;
  return (
    <div
      className={`cmp-row${row.id % 2 ? ' alt' : ''}`}
      onClick={() => onToggle(row.id)}
      style={{
        height: rowHeight(row),
        background: row.hot > 0 ? '#fff8c5' : undefined,
      }}
    >
      <div className="cmp-row__idx">#{row.id.toLocaleString()}</div>
      <div className="cmp-row__body">
        <div className="cmp-row__title">{row.title}</div>
        <div className="cmp-row__text">{row.text}</div>
        {row.hasImage && (
          <div className={`cmp-row__media${row.imageLoaded ? ' loaded' : ' pending'}`}>
            {row.imageLoaded ? `🖼  asset-${row.id % 1000}.jpg` : '⏳ loading…'}
          </div>
        )}
        {row.expanded && (
          <div className="cmp-row__expand">
            Expanded detail panel — adds 200px of content. Click row again to collapse.
            <br />Generated lazily on demand.
          </div>
        )}
      </div>
    </div>
  );
}

export function ComparisonDemo() {
  const [scenario, setScenario] = useState<Scenario>('dynamic-height');
  const [, setTick] = useState(0);
  const force = useCallback(() => setTick((t) => (t + 1) | 0), []);

  // Build a brand-new datasource each time the scenario (and therefore total
  // count) changes — both sides see the same one.
  const ds = useMemo(
    () => makeRowDatasource(SIZE_BY_SCENARIO[scenario], scenario),
    [scenario],
  );

  const rwRef = useRef<VariableSizeList>(null);
  const csRef = useRef<CeriousScrollHandle>(null);

  // Reset the competitor's cached sizes whenever the dataset identity changes
  // — otherwise the previous scenario's heights bleed through.
  useEffect(() => {
    rwRef.current?.resetAfterIndex(0, true);
  }, [ds]);

  // Re-render both sides when the datasource emits an async update (image
  // loads). Cerious picks up the height change automatically; react-window
  // still needs the cache invalidated, which is the whole point of the demo.
  useEffect(() => ds.subscribe(force), [ds, force]);

  const toggleExpand = useCallback(
    (id: number) => {
      const r = ds.getRow(id);
      if (r.isSheet) {
        ds.setOverride(id, { expanded: !r.expanded });
      } else if (r.isChat) {
        ds.setOverride(id, { editing: !r.editing });
      } else {
        ds.setOverride(id, { expanded: !r.expanded });
      }
      // For Cerious we just re-render; ResizeObserver picks it up.
      force();
      // Intentionally NOT calling resetAfterIndex here so react-window's
      // breakage is visible in scenario #2.
    },
    [ds, force],
  );

  // continuous updates loop
  const liveRef = useRef<number | null>(null);
  useEffect(() => {
    if (scenario !== 'continuous-updates') {
      if (liveRef.current) window.clearInterval(liveRef.current);
      liveRef.current = null;
      return;
    }
    liveRef.current = window.setInterval(() => {
      const seed = (performance.now() | 0) & 0xffff;
      pickIndices(ds.total, 50, seed).forEach((i, k) => {
        const grow = (k & 1) === 0;
        ds.setOverride(i, {
          scale: grow ? 1.6 : 1,
          hot: (ds.getRow(i).hot + 1) & 7,
        });
      });
      force();
    }, 120);
    return () => {
      if (liveRef.current) window.clearInterval(liveRef.current);
      liveRef.current = null;
    };
  }, [scenario, ds, force]);

  const resetCompetitor = () => rwRef.current?.resetAfterIndex(0, true);

  // --- Render --------------------------------------------------------------

  const scenarioMeta = SCENARIOS.find((s) => s.id === scenario)!;

  // react-window adapter: itemSize MUST be stable per index between resets, but
  // we deliberately lie to it (return the *current* truth) so the demo can
  // illustrate the resulting drift visually. Without resetAfterIndex it still
  // uses its cached values for layout math.
  const rwItemSize = (i: number) => ds.rowHeight(i);

  return (
    <div className="cmp-page">
      <div className="cmp-header">
        <h1>⚔️ Cerious Scroll vs Traditional Virtualization</h1>
        <p>Same dataset, same mutation, two engines. Watch which one stays stable.</p>
      </div>

      <div className="cmp-toolbar">
        <label htmlFor="scn">Scenario</label>
        <select
          id="scn"
          value={scenario}
          onChange={(e) => setScenario(e.target.value as Scenario)}
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        {scenario === 'dynamic-height' && (
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Scroll to find rows up to 1800px tall (taller than the viewport).
          </span>
        )}
        {scenario === 'async-images' && (
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Every row loads an image asynchronously — height grows on arrival.
          </span>
        )}
        {scenario === 'continuous-updates' && (
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Streaming 50 mutations every 120ms…
          </span>
        )}
        {scenario === 'expanding' && (
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Click any row to toggle expand.
          </span>
        )}
        {scenario === 'chat-markdown' && (
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Click any message to toggle edit mode (changes the row's height).
          </span>
        )}
        {scenario === 'spreadsheet' && (
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Scroll horizontally inside each row; click to expand a detail panel.
          </span>
        )}

        <span className="spacer" />
        <button type="button" onClick={resetCompetitor} title="Force react-window to re-measure">
          Reset react-window cache
        </button>
        <span className="scenario-desc">{scenarioMeta.desc}</span>
      </div>

      <div className="cmp-stage">
        <section className="cmp-side cmp-side--competitor">
          <header className="cmp-side__head">
            <span className="title">react-window</span>
            <span className="badge">VariableSizeList</span>
            <span className="cmp-side__stats">
              <span>rows <span className="stat-num">{ds.total.toLocaleString()}</span></span>
              {scenario === 'millions' && (
                <span style={{ color: '#cf222e', fontWeight: 600 }}>⚠ capped ≈ 411k by browser scrollHeight
                </span>
              )}
            </span>
          </header>
          <div className="cmp-side__body">
            <AutoSizer>
              {({ width, height }) => (
                <VariableSizeList
                  ref={rwRef}
                  className="rw-scroll"
                  height={height}
                  width={width}
                  itemCount={ds.total}
                  itemSize={rwItemSize}
                  estimatedItemSize={80}
                >
                  {({ index, style }: ListChildComponentProps) => (
                    <div style={style}>
                      <RowView row={ds.getRow(index)} onToggle={toggleExpand} />
                    </div>
                  )}
                </VariableSizeList>
              )}
            </AutoSizer>
            <div className="cmp-warn">
              {scenario === 'millions'
                ? 'Browser caps element scrollHeight at ≈33.5M px. 5M × 80px = 400M px → list tops out near row 411,000 of 5,000,000.'
                : 'Cached itemSize map — mutations require manual resetAfterIndex().'}
            </div>
          </div>
        </section>

        <section className="cmp-side cmp-side--cerious">
          <header className="cmp-side__head">
            <span className="title">Cerious Scroll</span>
            <span className="badge">React</span>
            <span className="cmp-side__stats">
              <span>rows <span className="stat-num">{ds.total.toLocaleString()}</span></span>
            </span>
          </header>
          <div className="cmp-side__body">
            <CeriousScroll
              ref={csRef}
              className={`demo-scroll${scenario === 'spreadsheet' ? ' is-spreadsheet' : ''}`}
              totalElements={ds.total}
              getItem={(i) => ds.getRow(i)}
              renderItem={(row) => <RowView row={row} onToggle={toggleExpand} />}
            />
            <div className="cmp-warn">
              {scenario === 'millions'
                ? 'Sibling-driver scrollbar decouples virtual position from native scrollHeight — row 4,999,999 is reachable.'
                : "No size cache — ResizeObserver tracks each row's real height live."}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Minimal AutoSizer (avoids adding react-virtualized-auto-sizer dep). */
function AutoSizer({
  children,
}: {
  children: (size: { width: number; height: number }) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setSize({ width: cr.width, height: cr.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      {size.width > 0 && size.height > 0 && children(size)}
    </div>
  );
}
