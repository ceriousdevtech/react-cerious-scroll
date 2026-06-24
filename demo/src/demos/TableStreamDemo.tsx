import { useCallback, useEffect, useRef, useState } from 'react';
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

// The dataset GROWS in place as events arrive. The binding calls the engine's
// updateTotalElements (no recreate — an in-progress scrollbar drag survives), so
// the oldest event keeps a STABLE bottom index: scrolling to the bottom doesn't
// bounce. Content is index-addressed — index i shows seq = baseSeq - i (index 0
// = newest = baseSeq, index total-1 = oldest = seq 0) — and "prepending k" grows
// both total and baseSeq by k while we shift the anchor by k to hold position.
const INITIAL_TOTAL = 2000;

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

  // Content is addressed by `seq` (index 0 = newest = baseSeq), held in refs read
  // by the renderer. A prepend updates baseSeqRef and calls recalculate(), which
  // re-runs renderItem for every visible row — so the content stays in sync with
  // the anchored position.
  const baseSeqRef = useRef(INITIAL_TOTAL - 1);
  const freshMinSeqRef = useRef(-1);
  const followRef = useRef(false);
  const [total, setTotal] = useState(INITIAL_TOTAL); // grows as events arrive
  const [follow, setFollow] = useState(false);
  const [newAbove, setNewAbove] = useState(0);
  const [seen, setSeen] = useState(INITIAL_TOTAL); // events that have entered the stream
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

    const nextTotal = s.totalElements + k;
    baseSeqRef.current += k;                          // k newer events enter at the top
    freshMinSeqRef.current = baseSeqRef.current - k + 1; // mark the just-arrived batch NEW

    // Grow the dataset IN PLACE — no recreate, so a scrollbar drag survives and
    // the oldest event keeps a stable bottom index (no bouncing tail).
    s.updateTotalElements(nextTotal);

    if (followRef.current) {
      ref.current?.jumpToElement(0);                 // ride the newest
    } else {
      // Hold the SAME logical row: it shifted from index anchorEl to anchorEl+k.
      // jumpToElement re-anchors; restoring scrollOffset keeps the sub-row
      // position; recalculate re-renders the visible rows with the new baseSeq
      // content (and re-measures their heights). All synchronous → 1 paint.
      const target = Math.min(anchorEl + k, nextTotal - 1);
      ref.current?.jumpToElement(target);
      if (anchorOff > 0 && ref.current?.scroller) ref.current.scroller.scrollOffset = anchorOff;
      if (!wasAtTop) setNewAbove((n) => n + k);
    }
    ref.current?.recalculate();
    // The track just got longer — re-pin the thumb (a bottom-parked thumb would
    // otherwise ride up on the first append). Defers if the user is mid-drag.
    s.syncScrollbar();
    setTotal(nextTotal);                             // keep the totalElements prop in sync
    setSeen(nextTotal);
    refreshStat();
  }, [refreshStat]);

  // Live feed.
  useEffect(() => {
    if (!live) return;
    liveTimerRef.current = setInterval(() => prepend(1 + Math.floor(Math.random() * 3)), 1300);
    return () => { if (liveTimerRef.current) clearInterval(liveTimerRef.current); };
  }, [live, prepend]);

  const goTop = () => { ref.current?.jumpToElement(0); setNewAbove(0); refreshStat(); };

  // Identity-stable: reads the live baseSeq/freshMin from refs. recalculate() in
  // prepend() re-runs this for every visible row, so the content refreshes with
  // the anchored position without the toolbar re-rendering every row on scroll.
  const renderItem = useCallback((index: number) => {
    const seq = baseSeqRef.current - index;
    const ev = makeEvent(seq);
    const isNew = freshMinSeqRef.current >= 0 && seq >= freshMinSeqRef.current;
    const ago = baseSeqRef.current - seq;
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
  }, []);

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
          totalElements={total}
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
