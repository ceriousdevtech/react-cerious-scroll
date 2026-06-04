/**
 * Shared dataset + mutable state model used by both the competitor side and the
 * Cerious side of the comparison demo. The dataset is purely functional / lazy
 * — `getRow(i)` reads from a `Map` of overrides on top of a deterministic
 * baseline so we can fake "millions" without allocating an array.
 */

import { rand } from '../lib/random';

export type Scenario =
  | 'baseline'
  | 'dynamic-height'
  | 'expanding'
  | 'async-images'
  | 'millions'
  | 'continuous-updates'
  | 'chat-markdown'
  | 'spreadsheet';

export interface CmpRow {
  id: number;
  title: string;
  text: string;
  baseHeight: number;
  /** runtime overrides: */
  scale: number;
  expanded: boolean;
  /** Async-images scenario: this row reserves space for an image. */
  hasImage: boolean;
  imageLoaded: boolean;
  hot: number;
  /** Chat-markdown scenario. */
  isChat?: boolean;
  author?: string;
  ts?: string;
  lines?: string[];
  hasCode?: boolean;
  editing?: boolean;
  /** Spreadsheet scenario. */
  isSheet?: boolean;
  cells?: string[];
}

const TITLES = [
  'Quarterly report', 'Server uptime', 'Pull request merged', 'Build #4218',
  'Deploy succeeded', 'Latency spike', 'New comment', 'Cache invalidated',
  'Auth event', 'Memory pressure', 'Queue drained', 'User signed up',
];
const TEXT_FRAGS = [
  'lorem ipsum dolor sit amet consectetur adipiscing elit',
  'sed do eiusmod tempor incididunt ut labore et dolore magna',
  'duis aute irure dolor in reprehenderit in voluptate velit esse',
  'excepteur sint occaecat cupidatat non proident sunt in culpa',
];

export function baseHeightFor(i: number): number {
  return [56, 72, 96, 64, 120][i % 5];
}

// Scales chosen to produce rows taller than a typical demo viewport
// (avg viewport ~500–700px). 8×120 = 960px, 18×64 = 1152px.
const DYNAMIC_SCALES = [3, 5, 8, 10, 12, 15, 18, 6];

export function imageRowHeight(loaded: boolean): number {
  return loaded ? 160 : 0;
}

export function chatRowHeight(r: CmpRow): number {
  if (r.editing) return 180; // textarea + header + buttons
  const header = 28;
  const padding = 16;
  const lineH = 20;
  const lineCount = r.lines?.length ?? 1;
  const code = r.hasCode ? 110 : 0;
  return header + padding + lineCount * lineH + code;
}

export function makeRowDatasource(total: number, scenario?: Scenario) {
  const overrides = new Map<number, Partial<CmpRow>>();
  const subscribers = new Set<() => void>();
  const imageRequested = new Set<number>();
  let notifyScheduled = false;
  const notify = (): void => {
    if (notifyScheduled) return;
    notifyScheduled = true;
    queueMicrotask(() => {
      notifyScheduled = false;
      subscribers.forEach((cb) => cb());
    });
  };

  if (scenario === 'dynamic-height') {
    for (let i = 7; i < total; i += 22) {
      const scale = DYNAMIC_SCALES[((i / 22) | 0) % DYNAMIC_SCALES.length];
      overrides.set(i, { scale });
    }
  }

  const getRow = (i: number): CmpRow => {
    const baseHeight = baseHeightFor(i);
    const hasImage = scenario === 'async-images';
    if (scenario === 'spreadsheet') {
      const cells: string[] = new Array(60);
      for (let c = 0; c < 60; c++) {
        const v = (i * 13 + c * 7) % 1000;
        cells[c] = c === 0 ? `R${i}` : `${v}.${(v * 3) % 100}`;
      }
      const base: CmpRow = {
        id: i,
        title: '',
        text: '',
        baseHeight: 36,
        scale: 1,
        expanded: false,
        hasImage: false,
        imageLoaded: false,
        hot: 0,
        isSheet: true,
        cells,
      };
      const ov = overrides.get(i);
      return ov ? { ...base, ...ov } : base;
    }
    if (scenario === 'chat-markdown') {
      const authors = ['ada', 'linus', 'grace', 'guido', 'brendan', 'matz', 'rich', 'rasmus'];
      const lineCount = 1 + (i % 5);
      const lines: string[] = [];
      for (let k = 0; k < lineCount; k++) {
        lines.push(TEXT_FRAGS[(i + k) % TEXT_FRAGS.length]);
      }
      const hasCode = i % 7 === 0;
      const base: CmpRow = {
        id: i,
        title: '',
        text: '',
        baseHeight: 0,
        scale: 1,
        expanded: false,
        hasImage: false,
        imageLoaded: false,
        hot: 0,
        isChat: true,
        author: authors[i % authors.length],
        ts: new Date(1700000000000 + i * 47_000).toISOString().slice(11, 16),
        lines,
        hasCode,
        editing: false,
      };
      const ov = overrides.get(i);
      return ov ? { ...base, ...ov } : base;
    }
    const base: CmpRow = {
      id: i,
      title: TITLES[i % TITLES.length],
      text: TEXT_FRAGS[i % TEXT_FRAGS.length] + ' #' + i,
      baseHeight,
      scale: 1,
      expanded: false,
      hasImage,
      imageLoaded: false,
      hot: 0,
    };
    const ov = overrides.get(i);
    const row = ov ? { ...base, ...ov } : base;

    if (hasImage && !row.imageLoaded && !imageRequested.has(i)) {
      imageRequested.add(i);
      const delay = 200 + (i % 9) * 90;
      setTimeout(() => {
        const prev = overrides.get(i) ?? {};
        overrides.set(i, { ...prev, imageLoaded: true });
        notify();
      }, delay);
    }
    return row;
  };

  const setOverride = (i: number, patch: Partial<CmpRow>): void => {
    const prev = overrides.get(i) ?? {};
    overrides.set(i, { ...prev, ...patch });
  };

  const clearOverrides = (): void => {
    overrides.clear();
  };

  const rowHeight = (i: number): number => {
    const r = getRow(i);
    if (r.isSheet) return r.expanded ? 36 + 240 : 36;
    if (r.isChat) return chatRowHeight(r);
    const base = Math.round(r.baseHeight * r.scale);
    if (r.expanded) return base + 200;
    return r.hasImage ? base + imageRowHeight(r.imageLoaded) : base;
  };

  const subscribe = (cb: () => void): (() => void) => {
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  };

  return { total, getRow, setOverride, clearOverrides, rowHeight, subscribe };
}

export type RowDatasource = ReturnType<typeof makeRowDatasource>;

export const SCENARIOS: { id: Scenario; label: string; desc: string }[] = [
  {
    id: 'dynamic-height',
    label: '1. Dynamic height',
    desc: 'Mixed row heights including rows that are 500–1800px tall (larger than the viewport). The competitor caches its initial size estimate and the scrollbar drifts as you scroll past the giants. Cerious re-measures via ResizeObserver.',
  },
  {
    id: 'expanding',
    label: '2. Expanding rows',
    desc: 'Click any row to expand/collapse. react-window needs an explicit resetAfterIndex() call; Cerious reflows automatically.',
  },
  {
    id: 'async-images',
    label: '3. Async images',
    desc: 'Every row carries an image that loads asynchronously, growing the row by 160px when it lands. The competitor\'s cached estimateSize lags every load; Cerious tracks each one live.',
  },
  {
    id: 'millions',
    label: '4. Millions of rows',
    desc: '5,000,000 rows. The competitor must paint a spacer of itemCount × itemSize px, but browsers cap any element\'s scrollHeight at ~33.5M px — so the list silently clamps near row 411,000. Cerious\'s sibling-driver scrollbar is decoupled from native scrollHeight and reaches all 5M.',
  },
  {
    id: 'continuous-updates',
    label: '5. Continuous updates',
    desc: 'Mutate 50 random rows per tick (text + height). Watch the scrollbar drift on the left as cached sizes lag the truth.',
  },
  {
    id: 'chat-markdown',
    label: '6. Chat with markdown 🔥',
    desc: '100,000 chat messages with variable line counts and inline code blocks. Click any message to enter edit mode (different height). react-window\'s cached itemSize cannot know a row was edited — you must call resetAfterIndex(editedIndex) manually after every edit, or the layout silently corrupts. Cerious re-measures via ResizeObserver.',
  },
  {
    id: 'spreadsheet',
    label: '7. Spreadsheet 🔥',
    desc: '50,000 rows × 60 cells with native horizontal scroll inside each row. Click any row to expand a 240px detail panel. react-window\'s cached itemSize never learns the new height — you must call resetAfterIndex(toggledIndex) after every toggle. Cerious reflows on its own.',
  },
];

export function pickIndices(total: number, n: number, seed: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    out.push(Math.floor(rand(seed + k, 0) * total));
  }
  return out;
}
