/**
 * <CeriousScroll> - declarative React component for @ceriousdevtech/cerious-scroll.
 *
 * Copyright (c) 2024-2026 Cerious DevTech LLC. All rights reserved.
 */

import {
  forwardRef,
  useImperativeHandle,
  type CSSProperties,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from 'react';
import type {
  CeriousScroll as CeriousScrollEngine,
  MeasuredViewportRange,
} from '@ceriousdevtech/cerious-scroll';

import { useCeriousScroll, type UseCeriousScrollOptions } from './use-cerious-scroll';

export interface CeriousScrollProps<TItem = unknown>
  extends UseCeriousScrollOptions<TItem> {
  /** Class applied to the scroll container. */
  className?: string;
  /**
   * Inline styles for the scroll container. You must give the container a
   * height (e.g. `style={{ height: 400 }}`) for scrolling to work.
   */
  style?: CSSProperties;
  /** Forwarded to the scroll container for testing. */
  'data-testid'?: string;
}

export interface CeriousScrollHandle {
  /** The underlying engine instance (`null` before mount). */
  scroller: CeriousScrollEngine | null;
  render(): MeasuredViewportRange | null;
  jumpToElement(index: number): MeasuredViewportRange | null;
  scrollToPercentage(percentage: number): MeasuredViewportRange | null;
  reset(): MeasuredViewportRange | null;
  /**
   * Discard all cached row heights and re-measure. Use only when the heights of
   * already-rendered rows changed without their indices changing (e.g. a global
   * density/layout switch) — not for routine cell edits.
   */
  recalculate(): MeasuredViewportRange | null;
}

function CeriousScrollInner<TItem>(
  props: CeriousScrollProps<TItem>,
  ref: ForwardedRef<CeriousScrollHandle>,
): ReactElement {
  const { className, style, 'data-testid': testId, ...hookOptions } = props;
  const {
    containerRef,
    portals,
    scroller,
    render,
    jumpToElement,
    scrollToPercentage,
    reset,
    recalculate,
  } = useCeriousScroll<TItem>(hookOptions);

  useImperativeHandle(
    ref,
    () => ({ scroller, render, jumpToElement, scrollToPercentage, reset, recalculate }),
    [scroller, render, jumpToElement, scrollToPercentage, reset, recalculate],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      data-testid={testId}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {portals}
    </div>
  );
}

/**
 * High-performance virtual scroll list. Provide `items` (or `totalElements` +
 * `getItem`) and a `renderItem` render prop; give the container a height.
 */
export const CeriousScroll = forwardRef(CeriousScrollInner) as <TItem = unknown>(
  props: CeriousScrollProps<TItem> & { ref?: Ref<CeriousScrollHandle> },
) => ReactElement;
