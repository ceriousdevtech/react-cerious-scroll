/**
 * Masonry with real content: network images, composed components, and an
 * interactive carousel per card.
 *
 * The three constraints this demonstrates all follow from one fact — cards are
 * mounted only while near the viewport, and the engine sizes a card before the
 * browser lays it out:
 *
 *   1. Media space is reserved from intrinsic dimensions, because a card that
 *      grows after mount is never re-measured and overlaps its neighbour.
 *   2. Card height is enforced, not estimated: the chrome below the image is
 *      given a fixed height so `getItemHeight` cannot disagree with the DOM.
 *   3. Per-card UI state lives outside the component, keyed by index, because a
 *      card unmounts as soon as it leaves the overscan window.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  CeriousScroll,
  type CeriousScrollHandle,
  type CeriousScrollOptions,
} from '@ceriousdevtech/react-cerious-scroll';

import { rand } from '../lib/random';
import './masonry.css';

const ITEM_COUNTS = [1_000, 50_000, 200_000] as const;
const RATIOS = [3 / 4, 4 / 3, 1, 9 / 16, 16 / 9, 2 / 3] as const;
const AUTHORS = ['A. Lovelace', 'L. Torvalds', 'G. Hopper', 'A. Turing', 'M. Hamilton', 'R. Perlman'] as const;
const TAGS = ['landscape', 'portrait', 'street', 'studio', 'archive', 'macro'] as const;

/**
 * Height of everything below the image. Enforced in CSS as well as declared
 * here — see `.gallery-card__chrome`. A value that merely *estimates* the
 * rendered chrome is the usual reason cards overlap.
 */
const CHROME_H = 132;

interface CardModel {
  ratio: number;
  author: string;
  tag: string;
  likes: number;
  frames: number;
}

function cardModel(index: number): CardModel {
  const frames = rand(index, 5) < 0.35 ? 2 + Math.floor(rand(index, 6) * 4) : 1;
  return {
    ratio: RATIOS[Math.floor(rand(index, 1) * RATIOS.length)],
    author: AUTHORS[Math.floor(rand(index, 2) * AUTHORS.length)],
    tag: TAGS[Math.floor(rand(index, 3) * TAGS.length)],
    likes: Math.floor(rand(index, 4) * 900),
    frames,
  };
}

/** Canonical mode: a pure function of index and column width. Never measures. */
function heightFor(index: number, columnWidth: number): number {
  return Math.round(columnWidth * cardModel(index).ratio) + CHROME_H;
}

/**
 * Round the request up to a 100px bucket. A CDN that resizes on demand caches
 * per exact URL, so an unbucketed width makes every container size a fresh
 * origin render.
 */
const bucket = (width: number) => Math.ceil(width / 100) * 100;

function imageUrl(index: number, frame: number, columnWidth: number): string {
  const w = bucket(columnWidth);
  return `https://picsum.photos/seed/rcs${index}-${frame}/${w}/${Math.round(w * cardModel(index).ratio)}`;
}

/**
 * Carousel frame per card, and likes. Kept OUTSIDE React state on purpose: a
 * card unmounts when it leaves the window, so component state would reset every
 * time the viewer scrolled past. Keyed by card index, it survives.
 */
const frameByCard = new Map<number, number>();
const likedCards = new Set<number>();

/** Warmed image cache, bounded. Low priority so visible cards preempt it. */
const warmed = new Set<number>();
function warm(index: number, total: number, columnWidth: number) {
  if (index < 0 || index >= total || warmed.has(index)) return;
  warmed.add(index);
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'low';
  image.src = imageUrl(index, 0, columnWidth);
  if (warmed.size > 600) warmed.clear();
}

function GalleryCard({
  index,
  columnWidth,
  onChange,
}: {
  index: number;
  columnWidth: number;
  onChange: () => void;
}) {
  const card = cardModel(index);
  const frame = frameByCard.get(index) ?? 0;
  const liked = likedCards.has(index);
  const hue = Math.floor(rand(index, 9) * 360);

  const step = (delta: number) => {
    frameByCard.set(index, (frame + delta + card.frames) % card.frames);
    onChange();
  };

  return (
    <div className="gallery-card">
      <div
        className="gallery-card__media"
        style={{ aspectRatio: `1 / ${card.ratio}`, background: `hsl(${hue} 28% 22%)` }}
      >
        {/* `key` on the frame forces a fresh <img>, so the fade-in replays. */}
        <img
          key={frame}
          src={imageUrl(index, frame, columnWidth)}
          width={bucket(columnWidth)}
          height={Math.round(bucket(columnWidth) * card.ratio)}
          decoding="async"
          fetchPriority="high"
          alt=""
          onLoad={(event) => event.currentTarget.classList.add('is-loaded')}
        />
        {card.frames > 1 && (
          <>
            <button type="button" className="gallery-card__nav gallery-card__nav--prev"
              onClick={() => step(-1)} aria-label="Previous image">‹</button>
            <button type="button" className="gallery-card__nav gallery-card__nav--next"
              onClick={() => step(1)} aria-label="Next image">›</button>
            <span className="gallery-card__dots">
              {Array.from({ length: card.frames }, (_, k) => (
                <i key={k} className={k === frame ? 'is-on' : undefined} />
              ))}
            </span>
          </>
        )}
      </div>

      <div className="gallery-card__chrome" style={{ height: CHROME_H }}>
        <div className="gallery-card__byline">
          <span className="gallery-card__avatar">{card.author.split(' ')[1][0]}</span>
          <span className="gallery-card__author">{card.author}</span>
          <span className="gallery-card__badge">{card.tag}</span>
        </div>
        <p className="gallery-card__title">
          Frame {index.toLocaleString()} — {card.tag} study,{' '}
          {card.frames > 1 ? `${card.frames} shots` : 'single shot'}
        </p>
        <div className="gallery-card__actions">
          <button
            type="button"
            className={liked ? 'is-liked' : undefined}
            onClick={() => {
              if (liked) likedCards.delete(index); else likedCards.add(index);
              onChange();
            }}
          >
            {liked ? '♥' : '♡'} {card.likes + (liked ? 1 : 0)}
          </button>
          <span>#{index.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export function MasonryGalleryDemo() {
  const ref = useRef<CeriousScrollHandle>(null);
  const [total, setTotal] = useState(50_000);
  const [jump, setJump] = useState('25000');
  const [stat, setStat] = useState('scroll to see live stats');
  const [, forceRender] = useState(0);
  const bump = useCallback(() => forceRender((n) => n + 1), []);

  /**
   * The live column width, captured from `getItemHeight`'s second argument.
   * That callback is the one place the engine reports it on every layout, so
   * cards can request an image at the size actually displayed.
   */
  const columnWidth = useRef(260);

  const options = useMemo<CeriousScrollOptions>(() => ({
    layout: 'masonry',
    wheel: { smooth: true, notchThresholdPx: Infinity },
    masonry: {
      getItemHeight: (index: number, width: number) => {
        columnWidth.current = width;
        return heightFor(index, width);
      },
      gap: 14,
      targetColumnWidth: 260,
      segmentSize: 500,
    },
  }), []);

  const refreshStat = useCallback(() => {
    const scroller = ref.current?.scroller;
    if (!scroller) return;
    setStat(`${scroller.scrollPercentage.toFixed(1)}% · ${warmed.size} images warmed`);

    // Prefetch a small window beyond the mounted range. Keep it small: a browser
    // allows roughly six connections per host, so a large speculative window
    // queues ahead of the images actually on screen.
    const view = scroller.startElement * 500;
    for (let i = view; i < view + 40; i++) warm(i, total, columnWidth.current);
  }, [total]);

  const go = () => {
    const index = Number.parseInt(jump, 10);
    if (Number.isFinite(index)) ref.current?.jumpToItem(Math.max(0, Math.min(total - 1, index)));
    refreshStat();
  };

  return (
    <div className="demo-page">
      <div className="demo-page__header">
        <h1>🖼️ Masonry · real content</h1>
        <p>
          Network images, composed React components, and a carousel inside every multi-shot
          card — virtualized. Media space is reserved, chrome height is enforced, and per-card
          state lives outside the component so it survives unmounting.
        </p>
      </div>

      <div className="demo-toolbar">
        <label htmlFor="gallery-items">Items</label>
        <select id="gallery-items" value={total} onChange={(event) => setTotal(Number(event.target.value))}>
          {ITEM_COUNTS.map((count) => <option key={count} value={count}>{count.toLocaleString()}</option>)}
        </select>
        <input value={jump} type="number" onChange={(event) => setJump(event.target.value)} />
        <button type="button" onClick={go}>Go</button>
        <button type="button" onClick={() => { ref.current?.scrollToPercentage(0); refreshStat(); }}>Top</button>
        <button type="button" onClick={() => { ref.current?.scrollToPercentage(100); refreshStat(); }}>End</button>
        <span className="spacer" />
        <span className="stat">{stat}</span>
      </div>

      <CeriousScroll
        ref={ref}
        className="demo-scroll masonry-scroll"
        totalElements={total}
        getItem={(index) => index}
        options={options}
        onMeasuredViewport={refreshStat}
        renderItem={(index) => (
          <GalleryCard index={index} columnWidth={columnWidth.current} onChange={bump} />
        )}
      />

      <div className="demo-footer">
        <span>Total: <strong>{total.toLocaleString()}</strong></span>
        <span>Determinism: <strong>canonical</strong></span>
        <span>Images: <strong>reserved + prefetched</strong></span>
      </div>
    </div>
  );
}
