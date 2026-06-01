import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CeriousScroll,
  type CeriousScrollHandle,
} from '@ceriousdevtech/react-cerious-scroll';

import { buildLogOrder, LOG_LEVELS, makeLog, type LogLevel } from './log.data';
import './log.css';

export function LogViewerDemo() {
  const [active, setActive] = useState<ReadonlySet<LogLevel>>(new Set(LOG_LEVELS));
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const ref = useRef<CeriousScrollHandle>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(id);
  }, [query]);

  const order = useMemo(() => buildLogOrder(active, debounced), [active, debounced]);
  useEffect(() => {
    ref.current?.jumpToElement(0);
  }, [order]);

  const toggle = (level: LogLevel) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  return (
    <div className="demo-page">
      <div className="demo-page__header">
        <h1>📜 Log Viewer</h1>
        <p>{order.length.toLocaleString()} of 200,000 lines — filter by level, search the stream.</p>
      </div>

      <div className="demo-toolbar">
        {LOG_LEVELS.map((l) => (
          <span
            key={l}
            className={`chip ${l}${active.has(l) ? ' active' : ''}`}
            onClick={() => toggle(l)}
          >
            {l}
          </span>
        ))}
        <input
          type="search"
          placeholder="Search messages…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <span className="stat">
          <strong>{order.length.toLocaleString()}</strong> lines
        </span>
      </div>

      <CeriousScroll
        ref={ref}
        className="demo-scroll log-scroll"
        items={order}
        renderItem={(src) => {
          // When every level is filtered out the order array is empty, but the
          // engine still requires (and renders) one phantom row — `src` is then
          // `undefined`. Render nothing for it instead of crashing on `makeLog`.
          if (src == null) return null;
          const log = makeLog(src);
          return (
            <div className="log-row">
              <span className="log-time">{log.time}</span>
              <span className={`log-level ${log.level}`}>{log.level}</span>
              <span className="log-service">{log.service}</span>
              <span className="log-msg">{log.message}</span>
            </div>
          );
        }}
      />
    </div>
  );
}
