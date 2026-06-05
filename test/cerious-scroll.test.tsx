import { createRef, useState } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CeriousScroll, type CeriousScrollHandle } from '../src';

afterEach(() => cleanup());

/** Flush the requestAnimationFrame-deferred render(s) inside React's act(). */
async function flushFrames(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const items = Array.from({ length: 100 }, (_, i) => ({ id: i, label: `Item ${i}` }));

describe('<CeriousScroll>', () => {
  it('renders a bounded subset of rows from `items`', async () => {
    const { container } = render(
      <CeriousScroll
        items={items}
        renderItem={(item) => <div className="row">{item.label}</div>}
        style={{ height: 300 }}
      />,
    );

    await flushFrames();

    const rows = container.querySelectorAll('.row');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(items.length);
    expect(container.textContent).toContain('Item 0');
  });

  it('invokes onReady once with the engine instance', async () => {
    const onReady = vi.fn();
    render(
      <CeriousScroll
        items={items}
        renderItem={(item) => <span>{item.label}</span>}
        onReady={onReady}
        style={{ height: 300 }}
      />,
    );

    await flushFrames();

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady.mock.calls[0]![0]).toBeTruthy();
  });

  it('exposes an imperative handle that jumps to an element', async () => {
    const ref = createRef<CeriousScrollHandle>();
    const { container } = render(
      <CeriousScroll
        ref={ref}
        items={items}
        // Disable the native scrollbar so its bidirectional sync doesn't nudge
        // the position after the jump (the engine's jumpToElement itself is exact).
        options={{ attachScrollbar: false }}
        renderItem={(item) => <div className="row">{item.label}</div>}
        style={{ height: 300 }}
      />,
    );

    await flushFrames();

    await act(async () => {
      ref.current?.jumpToElement(50);
    });

    expect(ref.current?.scroller?.currentElement).toBe(50);
    expect(container.textContent).toContain('Item 50');
  });

  it('supports `totalElements` + `getItem` without an items array', async () => {
    const { container } = render(
      <CeriousScroll
        totalElements={1000}
        getItem={(index) => ({ id: index, label: `Row ${index}` })}
        renderItem={(item) => <div className="row">{item.label}</div>}
        style={{ height: 300 }}
      />,
    );

    await flushFrames();

    expect(container.querySelectorAll('.row').length).toBeGreaterThan(0);
    expect(container.textContent).toContain('Row 0');
  });

  it('does not re-render unchanged rows on a reposition render()', async () => {
    // A scroll repositions existing rows (the engine writes their `top` to the
    // DOM directly) without changing their content. The per-row portal cache
    // must reuse the existing nodes so renderItem is NOT re-invoked — this is
    // what keeps heavy rows cheap to scroll.
    const renderSpy = vi.fn((item: { id: number; label: string }) => (
      <div className="row">{item.label}</div>
    ));
    const ref = createRef<CeriousScrollHandle>();
    const { container } = render(
      <CeriousScroll
        ref={ref}
        items={items}
        options={{ attachScrollbar: false }}
        renderItem={renderSpy}
        style={{ height: 300 }}
      />,
    );

    await flushFrames();
    const before = container.querySelectorAll('.row').length;
    expect(before).toBeGreaterThan(0);

    renderSpy.mockClear();
    await act(async () => {
      ref.current?.render();
    });
    await flushFrames();

    // No row entered/left and no item changed → every portal is reused.
    expect(renderSpy).not.toHaveBeenCalled();
    expect(container.querySelectorAll('.row').length).toBe(before);
    expect(container.textContent).toContain('Item 0');
  });

  it('re-renders rows when their item references change', async () => {
    // The memo must not stale content: when the data updates (new item refs),
    // the affected rows have to re-render. Uses a stable renderItem so the cache
    // is driven purely by per-row item identity, not by renderItem identity.
    const renderSpy = vi.fn((item: { id: number; label: string }) => (
      <div className="row">{item.label}</div>
    ));

    function Harness() {
      const [data, setData] = useState(items);
      return (
        <>
          <button type="button" onClick={() => setData(items.map((it) => ({ ...it })))}>
            mutate
          </button>
          <CeriousScroll
            items={data}
            options={{ attachScrollbar: false }}
            renderItem={renderSpy}
            style={{ height: 300 }}
          />
        </>
      );
    }

    const { container, getByText } = render(<Harness />);
    await flushFrames();
    const rendered = container.querySelectorAll('.row').length;
    expect(rendered).toBeGreaterThan(0);

    renderSpy.mockClear();
    await act(async () => {
      getByText('mutate').click();
    });
    await flushFrames();

    // Every item got a fresh reference, so every rendered row re-renders.
    expect(renderSpy).toHaveBeenCalled();
    expect(container.querySelectorAll('.row').length).toBe(rendered);
    expect(container.textContent).toContain('Item 0');
  });

  it('unmounts cleanly without throwing', async () => {
    const { unmount } = render(
      <CeriousScroll
        items={items}
        renderItem={(item) => <div>{item.label}</div>}
        style={{ height: 300 }}
      />,
    );

    await flushFrames();
    expect(() => unmount()).not.toThrow();
  });
});
