/**
 * useCeriousScroll - React hook binding for @ceriousdevtech/cerious-scroll.
 *
 * Copyright (c) 2024-2026 Cerious DevTech LLC. All rights reserved.
 */

import {
  Fragment,
  createElement,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CeriousScroll as CeriousScrollEngine,
  type CeriousScrollOptions,
  type ElementRenderer,
  type MeasuredViewportRange,
} from '@ceriousdevtech/cerious-scroll';

import { ROW_ATTR, ensureContentElement } from './content-element';
import {
  subscribeViewportChange,
  type CeriousViewportChangeDetail,
} from './viewport-change';

export interface UseCeriousScrollOptions<TItem = unknown> {
  /** Total number of items. Falls back to `items.length` when omitted. */
  totalElements?: number | null;
  /** Optional items array (passed to `renderItem` as the first argument). */
  items?: readonly TItem[] | null;
  /** Optional getter for very large/sparse datasets (alternative to `items`). */
  getItem?: (index: number) => TItem;
  /** Renders a single row. `item` is `undefined` when no data source is given. */
  renderItem: (item: TItem, index: number) => ReactNode;
  /** Options forwarded to `new CeriousScroll(...)` (read once, at creation). */
  options?: CeriousScrollOptions;
  /** Automatically render after scroll/resize/data changes. Default: `true`. */
  autoRender?: boolean;
  /** Invoked with the normalized viewport-change payload. */
  onViewportChange?: (detail: CeriousViewportChangeDetail) => void;
  /** Invoked with the measured range after each render pass. */
  onMeasuredViewport?: (range: MeasuredViewportRange) => void;
  /** Invoked once the underlying engine instance is ready (and after recreation). */
  onReady?: (scroller: CeriousScrollEngine) => void;
}

export interface UseCeriousScrollResult {
  /** Attach to the scroll container element. */
  containerRef: RefObject<HTMLDivElement>;
  /** React portals for the currently rendered rows. Render these in your tree. */
  portals: ReactNode;
  /** The underlying engine instance (`null` before mount / after unmount). */
  scroller: CeriousScrollEngine | null;
  /** Imperatively trigger a render pass. */
  render: () => MeasuredViewportRange | null;
  /** Jump to an element index, then render. */
  jumpToElement: (index: number) => MeasuredViewportRange | null;
  /** Scroll to a percentage (0..100), then render. */
  scrollToPercentage: (percentage: number) => MeasuredViewportRange | null;
  /** Reset to the top, then render. */
  reset: () => MeasuredViewportRange | null;
  /**
   * Discard all cached row heights and re-measure the viewport.
   *
   * Call this only when the heights of rows you've *already rendered* may have
   * changed without their indices changing — e.g. a global font/density change,
   * or swapping every row to a different layout. This forces a synchronous
   * re-measure (one `offsetHeight` read per visible row), so do NOT call it on
   * routine edits: a single cell edit doesn't need it (its row keeps its size,
   * and the engine's ResizeObserver picks up any incidental resize on its own).
   */
  recalculate: () => MeasuredViewportRange | null;
}

interface RowEntry {
  el: HTMLElement;
  mount: HTMLDivElement;
}

interface Host {
  scroller: CeriousScrollEngine;
  contentEl: HTMLElement;
  container: HTMLElement;
}

function resolveTotal(
  total: number | null | undefined,
  len: number | null | undefined,
): number {
  const candidate =
    typeof total === 'number' ? total : typeof len === 'number' ? len : undefined;
  if (candidate === undefined || Number.isNaN(candidate)) {
    throw new Error('useCeriousScroll: provide `totalElements` or `items`.');
  }
  // CeriousScroll requires totalElements >= 1.
  return Math.max(1, Math.floor(candidate));
}

/**
 * Bind a CeriousScroll engine to a container and render rows as React portals.
 *
 * Each row is rendered into an inner mount node that lives inside the engine's
 * recyclable container and is committed synchronously via `flushSync`, so the
 * engine measures the row's real height (no estimation). Rows stay in your
 * React tree, so Context/providers work as usual.
 */
export function useCeriousScroll<TItem = unknown>(
  opts: UseCeriousScrollOptions<TItem>,
): UseCeriousScrollResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<Host | null>(null);
  const rowsRef = useRef<Map<number, RowEntry>>(new Map());
  const posRef = useRef<{ currentElement: number; scrollOffset: number } | null>(null);
  const [, forceRender] = useReducer((c: number) => c + 1, 0);
  const [scroller, setScroller] = useState<CeriousScrollEngine | null>(null);

  // Always-fresh refs so the stable closures below see the latest values.
  const renderItemRef = useRef(opts.renderItem);
  const itemsRef = useRef(opts.items ?? null);
  const getItemPropRef = useRef(opts.getItem);
  const optionsRef = useRef(opts.options);
  const autoRenderRef = useRef(opts.autoRender ?? true);
  const totalRef = useRef(opts.totalElements ?? null);
  const onViewportChangeRef = useRef(opts.onViewportChange);
  const onMeasuredViewportRef = useRef(opts.onMeasuredViewport);
  const onReadyRef = useRef(opts.onReady);

  renderItemRef.current = opts.renderItem;
  itemsRef.current = opts.items ?? null;
  getItemPropRef.current = opts.getItem;
  optionsRef.current = opts.options;
  autoRenderRef.current = opts.autoRender ?? true;
  totalRef.current = opts.totalElements ?? null;
  onViewportChangeRef.current = opts.onViewportChange;
  onMeasuredViewportRef.current = opts.onMeasuredViewport;
  onReadyRef.current = opts.onReady;

  const getItem = useCallback((index: number): TItem => {
    const getter = getItemPropRef.current;
    if (getter) return getter(index);
    const items = itemsRef.current;
    return (items ? items[index] : undefined) as TItem;
  }, []);

  const render = useCallback((): MeasuredViewportRange | null => {
    const host = hostRef.current;
    if (!host) return null;
    const { scroller: instance, contentEl, container } = host;
    const height = container.clientHeight || container.offsetHeight || 0;

    // Mounts created this pass: they hold static measurement HTML that must be
    // cleared before the live portals commit (React portals append to — they do
    // NOT clear — their container, so leftover static markup would shadow the
    // interactive row and never update).
    const freshMounts: HTMLDivElement[] = [];

    const renderer: ElementRenderer = (index, el) => {
      // The engine renders incrementally: it calls us, then immediately reads
      // the row's `offsetHeight` to decide whether the viewport is full. React
      // commits are asynchronous (and `flushSync` is silently dropped whenever
      // React is mid-render under concurrent mode), so we cannot rely on a
      // portal being in the DOM in time. Instead we paint the row's *static*
      // HTML synchronously for measurement, then mount the real, interactive
      // React portal into the same (cleared) node on the next commit (below).
      // Any small difference between the static and live height is reconciled by
      // the engine's own content observer, so positions stay correct.
      const mount = document.createElement('div');
      mount.setAttribute(ROW_ATTR, String(index));
      mount.innerHTML = renderToStaticMarkup(
        createElement(Fragment, null, renderItemRef.current(getItem(index), index)),
      );
      el.appendChild(mount);
      rowsRef.current.set(index, { el, mount });
      freshMounts.push(mount);
    };

    const range = instance.renderViewport(height, contentEl, renderer);

    // Drop rows the engine no longer renders.
    const active = new Set(instance.getRenderedIndices());
    rowsRef.current.forEach((_entry, index) => {
      if (!active.has(index)) rowsRef.current.delete(index);
    });

    // The engine has finished measuring, so the static HTML has done its job.
    // Strip it from the new mounts (only the plain, non-React ones) so the live
    // portals mount into empty nodes.
    freshMounts.forEach((mount) => {
      mount.textContent = '';
    });

    // Commit the live portals for all currently-rendered rows in ONE pass
    // (O(rows), not O(rows²)). We use `flushSync` so the rows are populated
    // before the browser paints this frame — otherwise, during a continuous
    // scrollbar drag the async commit is starved and the rows stay blank until
    // scrolling stops. This is safe (no infinite-loop risk) because the engine
    // already measured via the static markup above; if React happens to be
    // mid-render (so `flushSync` is a no-op) the rows simply fill on the next
    // commit instead.
    flushSync(forceRender);

    onMeasuredViewportRef.current?.(range);
    return range;
  }, []);

  // Create (and recreate, when the item count changes) the engine instance.
  const totalDep = opts.totalElements ?? opts.items?.length ?? null;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const contentEl = ensureContentElement(container);
    const userOptions = optionsRef.current ?? {};
    const userOnScroll = userOptions.onScroll;
    const mergedOptions: CeriousScrollOptions = {
      ...userOptions,
      onScroll: () => {
        userOnScroll?.();
        if (autoRenderRef.current) render();
      },
    };

    const total = resolveTotal(totalRef.current, itemsRef.current?.length ?? null);
    const instance = new CeriousScrollEngine(container, total, mergedOptions);

    // Restore scroll position across recreations (data-size changes).
    if (posRef.current) {
      instance.currentElement = Math.min(posRef.current.currentElement, total - 1);
      instance.scrollOffset = posRef.current.scrollOffset;
      posRef.current = null;
    }

    hostRef.current = { scroller: instance, contentEl, container };
    setScroller(instance);

    const unsubscribe = subscribeViewportChange(container, (detail) => {
      onViewportChangeRef.current?.(detail);
    });

    onReadyRef.current?.(instance);

    let rafId = 0;
    if (autoRenderRef.current) {
      rafId = requestAnimationFrame(() => render());
    }

    // Container resize (re-render, re-anchor, scrollbar re-sync) is handled by
    // the engine itself: its ResizeController observes the container and calls
    // back through the merged `onScroll` above. No wrapper-side observer needed.

    return () => {
      cancelAnimationFrame(rafId);
      unsubscribe();

      // Remember the position so a recreation can restore it.
      posRef.current = {
        currentElement: instance.currentElement,
        scrollOffset: instance.scrollOffset,
      };

      // Drop row portals before tearing down the engine. No flushSync here:
      // on unmount the portals leave with the component; on recreation the
      // follow-up render repopulates them.
      rowsRef.current.clear();

      contentEl.textContent = '';
      instance.detachScrollbar(container);
      instance.dispose();

      hostRef.current = null;
      setScroller(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalDep, render]);

  // Re-render when the data source changes identity but the count is unchanged.
  //
  // Row *content* updates on its own here: the portals below re-read getItem()
  // and React reconciles the new content into each mounted row. So we do NOT
  // clear the height cache — for the common editable-grid case (edit a cell, get
  // a new items reference, same row height) clearing would force a full viewport
  // re-measure on every keystroke for no benefit. We just reposition using the
  // existing cache; the engine's ResizeObserver keeps that cache correct for any
  // incidental height change. If *every* row's height changes at once (e.g. a
  // density/layout switch), call `recalculate()` instead.
  useEffect(() => {
    if (!hostRef.current || !autoRenderRef.current) return;
    const id = requestAnimationFrame(() => render());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.items, opts.getItem]);

  const jumpToElement = useCallback(
    (index: number): MeasuredViewportRange | null => {
      const host = hostRef.current;
      if (!host) return null;
      host.scroller.jumpToElement(index);
      return render();
    },
    [render],
  );

  const scrollToPercentage = useCallback(
    (percentage: number): MeasuredViewportRange | null => {
      const host = hostRef.current;
      if (!host) return null;
      host.scroller.handleScrollPercentage(percentage);
      return render();
    },
    [render],
  );

  const reset = useCallback((): MeasuredViewportRange | null => {
    const host = hostRef.current;
    if (!host) return null;
    host.scroller.reset();
    return render();
  }, [render]);

  const recalculate = useCallback((): MeasuredViewportRange | null => {
    const host = hostRef.current;
    if (!host) return null;
    // Discard the cached heights, then re-render. The engine re-measures and
    // re-caches the rendered rows during the pass and refreshes the scroll
    // percentage, so an in-place height change (e.g. expand/collapse) is
    // reflected in the total content height and scrollbar immediately.
    host.scroller.clearAllCaches();
    return render();
  }, [render]);

  // Build portals for the currently rendered rows. Reading the mutable ref here
  // is intentional: every mutation is paired with a synchronous re-render.
  //
  // When an `items`-backed list shrinks (e.g. a filter toggle drops the visible
  // set from 200k to 146k), a row the engine rendered against the *previous*
  // array can momentarily have an index past the new `items.length` — before the
  // engine has been recreated/repruned for the new total. `getItem` would return
  // `undefined`, and a `renderItem` that assumes a valid item (e.g. a lookup by
  // index) throws mid-render. Skip those stale rows; the next render pass prunes
  // them. (In `getItem` mode there is no array bound, so don't clamp.)
  const itemsForBound = itemsRef.current;
  const boundLength =
    !getItemPropRef.current && itemsForBound != null ? itemsForBound.length : null;
  const portals: ReactNode[] = [];
  rowsRef.current.forEach((entry, index) => {
    if (boundLength !== null && index >= boundLength) return;
    portals.push(
      createPortal(renderItemRef.current(getItem(index), index), entry.mount, String(index)),
    );
  });

  return {
    containerRef,
    portals,
    scroller,
    render,
    jumpToElement,
    scrollToPercentage,
    reset,
    recalculate,
  };
}
