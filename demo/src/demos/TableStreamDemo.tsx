import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  CeriousScroll,
  type CeriousScrollHandle,
} from '@ceriousdevtech/react-cerious-scroll';

import {
  STREAM_COLUMNS,
  STREAM_COLUMN_WIDTHS,
  makeEvent,
  type StreamEvent,
} from './table-stream.data';
import './table-stream.css';

// The engine's element count stays FIXED so it is never recreated on a prepend
// (growing totalElements would tear down + rebuild the whole scroller every
// inject — that read as flicker in React and scrollbar thrash in Vue/Angular).
// Instead we slide the content under a fixed window: index i shows
// seq = baseSeq - i, and "prepending k" just grows baseSeq by k (newer events
// enter at index 0) while we shift the scroll position by k to hold the anchor.
const TOTAL = 2000;

/** The variable-height EVENT cell body, rendered per event kind. */
function EventBody({ ev }: { ev: StreamEvent }) {
  switch (ev.kind) {
    case 'metric':
      return <p className="ev-text"><strong>{ev.service}</strong> · {ev.metricLine}</p>;
    case 'event':
      return <><p className="ev-title">{ev.title}</p><p className="ev-text">{ev.text}</p></>;
    case 'list':
      return <><p className="ev-title">{ev.title}</p><ul className="ev-list">{ev.listItems.map((it, i) => <li key={i}>{it}</li>)}</ul></>;
    case 'trace':
      return <><p className="ev-title">{ev.title}</p><pre className="ev-trace">{ev.traceLines.join('\n')}</pre></>;
    case 'json':
      return <><p className="ev-title">{ev.title}</p><pre className="ev-json">{ev.jsonLines.join('\n')}</pre></>;
  }
}

export function TableStreamDemo() {
  const ref = useRef<CeriousScrollHandle>(null);

  // Content is addressed by `seq` (index 0 = newest = baseSeq). `baseSeqRef` is the
  // source of truth read by the (stable) prepend/live callbacks; `baseSeq` STATE
  // mirrors it and drives renderItem's identity. The React wrapper renders rows as
  // portals cached by index that only re-render when renderItem's identity changes
  // — so on a small prepend, keying renderItem on `baseSeq` busts that cache and
  // every visible row refreshes to the new content (otherwise overlapping rows keep
  // stale content while the position shifts, and the view appears to scroll).
  const baseSeqRef = useRef(TOTAL - 1);
  const [baseSeq, setBaseSeq] = useState(TOTAL - 1);
  const freshMinSeqRef = useRef(-1);
  const followRef = useRef(false);
  const [follow, setFollow] = useState(false);
  const [newAbove, setNewAbove] = useState(0);
  const [seen, setSeen] = useState(TOTAL); // events that have entered the stream
  const [stat, setStat] = useState('scroll down, then inject to test anchoring');
  const [live, setLive] = useState(false);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const atTop = () => {
    const s = ref.current?.scroller;
    return !s || (s.currentElement === 0 && s.scrollOffset <= 0);
  };

  const refreshStat = useCallback(() => {
    const s = ref.current?.scroller;
    if (!s) return;
    const topSeqVisible = baseSeqRef.current - s.currentElement;
    setStat(`top event #${topSeqVisible.toLocaleString()} · idx ${s.currentElement.toLocaleString()} · ${s.scrollPercentage.toFixed(1)}%`);
    if (s.currentElement === 0 && s.scrollOffset <= 0) setNewAbove(0);
  }, []);

  // Park mid-list once on mount so anchoring is visible on the first inject.
  useEffect(() => {
    const id = requestAnimationFrame(() => { ref.current?.jumpToElement(40); refreshStat(); });
    return () => cancelAnimationFrame(id);
  }, [refreshStat]);

  const prepend = useCallback((k: number) => {
    const s = ref.current?.scroller;
    if (!s) return;
    const anchorEl = s.currentElement;
    const anchorOff = s.scrollOffset;
    const wasAtTop = atTop();

    baseSeqRef.current += k;                          // k newer events enter at the top
    freshMinSeqRef.current = baseSeqRef.current - k + 1; // mark the just-arrived batch NEW

    // Refresh the row CONTENT first (busts the portal cache so every visible row
    // re-renders with the new baseSeq), synchronously, so it lands in the same
    // paint as the position move below — no transient stale frame.
    flushSync(() => setBaseSeq(baseSeqRef.current));

    if (followRef.current) {
      ref.current?.jumpToElement(0);                 // ride the newest
    } else {
      // Hold the SAME logical row: it shifted from index anchorEl to anchorEl+k.
      // jumpToElement syncs the scrollbar thumb; restoring scrollOffset keeps the
      // sub-row position; recalculate re-renders the visible rows with the new
      // baseSeq content (and re-measures their heights). All synchronous → 1 paint.
      const target = Math.min(anchorEl + k, TOTAL - 1);
      ref.current?.jumpToElement(target);
      if (anchorOff > 0 && ref.current?.scroller) ref.current.scroller.scrollOffset = anchorOff;
      if (!wasAtTop) setNewAbove((n) => n + k);
    }
    ref.current?.recalculate();
    setSeen(baseSeqRef.current + 1);
    refreshStat();
  }, [refreshStat]);

  // Live feed.
  useEffect(() => {
    if (!live) return;
    liveTimerRef.current = setInterval(() => prepend(1 + Math.floor(Math.random() * 3)), 1300);
    return () => { if (liveTimerRef.current) clearInterval(liveTimerRef.current); };
  }, [live, prepend]);

  const goTop = () => { ref.current?.jumpToElement(0); setNewAbove(0); refreshStat(); };

  // Keyed on `baseSeq` so its identity changes on each prepend → the wrapper busts
  // its per-index portal cache and re-renders every visible row with fresh content.
  // (During plain scrolling baseSeq is constant, so identity is stable and rows are
  // not needlessly re-measured.)
  const renderItem = useCallback((index: number) => {
    const seq = baseSeq - index;
    const ev = makeEvent(seq);
    const isNew = freshMinSeqRef.current >= 0 && seq >= freshMinSeqRef.current;
    const ago = baseSeq - seq;
    return (
      <>
        <td className={`col-time${isNew ? ' is-new' : ''}`}>
          <span className="cell-time">{ev.clock}</span>
          <span className="cell-ago">{ago === 0 ? 'now' : `${ago}s ago`}</span>
        </td>
        <td className="col-level"><span className={`lvl lvl-${ev.level}`}>{ev.level}</span></td>
        <td className="col-event"><EventBody ev={ev} />{isNew && <span className="new-flag">NEW</span>}</td>
        <td className="col-seq"><span className="cell-seq">#{ev.seq.toLocaleString()}</span></td>
      </>
    );
  }, [baseSeq]);

  return (
    <div className="demo-page cs-stream-page">
      <div className="demo-page__header">
        <h1>📡 Native &lt;table&gt; · prepend &amp; scroll anchoring</h1>
        <p>
          New, <strong>variable-height</strong> rows are injected at the <strong>top</strong> of the stream —
          like a live telemetry feed or a chat-history backfill. Scroll down a bit, then inject: with
          anchoring on, the row you're reading stays put while new rows pile up above; with{' '}
          <em>Follow newest</em> on, the view rides the top instead.
        </p>
      </div>

      <div className="demo-toolbar">
        <button type="button" onClick={() => prepend(1)}>Inject 1 ↑</button>
        <button type="button" onClick={() => prepend(25)}>Backfill 25 ↑</button>
        <button type="button" onClick={() => setLive((v) => !v)}>
          <span className={`live-dot${live ? ' on' : ''}`} />Live feed
        </button>
        <label title="Jump to newest on every inject instead of holding position">
          <input
            type="checkbox"
            checked={follow}
            onChange={(e) => { setFollow(e.target.checked); followRef.current = e.target.checked; if (e.target.checked) goTop(); }}
          />{' '}
          Follow newest
        </label>
        <button type="button" onClick={goTop}>Top</button>
        <span className="stat">{stat}</span>
      </div>

      <div className="scroll-wrap">
        {newAbove > 0 && (
          <button type="button" className="new-above" onClick={goTop}>▲ {newAbove} new above</button>
        )}
        <CeriousScroll
          ref={ref}
          className="demo-scroll cs-table-scroll"
          totalElements={TOTAL}
          getItem={(i) => i}
          options={{ layout: 'table', table: { tableClassName: 'cs-table', columnWidths: [...STREAM_COLUMN_WIDTHS] } }}
          onViewportChange={refreshStat}
          tableHeader={
            <tr>
              {STREAM_COLUMNS.map((c) => (
                <th key={c.key} className={c.cls}>{c.label}</th>
              ))}
            </tr>
          }
          renderItem={renderItem}
        />
      </div>

      <div className="demo-footer">
        <span>Stream length: <strong>{seen.toLocaleString()}</strong></span>
        <span>Mode: <strong>layout: 'table'</strong></span>
        <span>Anchoring: <strong>{follow ? 'follow newest' : 'hold position'}</strong></span>
      </div>
    </div>
  );
}
