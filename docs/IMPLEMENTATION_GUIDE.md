# react-cerious-scroll Implementation Guide

**Copyright (c) 2024-2026 Cerious DevTech LLC. All rights reserved.**

---

## Table of Contents

1. [How the Hook Works Internally](#how-the-hook-works-internally)
2. [Modifying the Render Pipeline](#modifying-the-render-pipeline)
3. [Adding New Imperative Methods](#adding-new-imperative-methods)
4. [Props That Recreate the Engine vs Props That Don't](#props-that-recreate-the-engine-vs-props-that-dont)
5. [Testing](#testing)
6. [Common Pitfalls](#common-pitfalls)
7. [Build and Release](#build-and-release)

---

## How the Hook Works Internally

`useCeriousScroll` owns the entire lifecycle of one `CeriousScrollEngine` instance. Here is what happens from mount to unmount:

### Mount

1. `useEffect([totalDep])` fires after the first render.
2. `ensureContentElement(container)` creates (or finds) a `data-cerious-scroll-content` child element inside the container div. This element is the rendering target passed to the engine; it is separate from the native scrollbar DOM so the engine's `textContent` clearing never wipes the scrollbar.
3. `new CeriousScrollEngine(container, total, mergedOptions)` creates the engine. `mergedOptions` wraps the user's `onScroll` callback so the wrapper's `render()` is called after every scroll event.
4. `subscribeViewportChange` attaches a listener for the `cerious-viewport-change` DOM event and forwards it to `onViewportChange`.
5. `requestAnimationFrame(() => render())` schedules the first render pass.

### Render Pass

See [Render Pipeline](ARCHITECTURE.md#render-pipeline) in the Architecture doc for the full sequence. The key invariant: every row in `rowsRef` at the time `flushSync` fires will appear in the portals array. React reconciles — rows that already had portals are updated in place; new rows get new portals.

### Unmount

1. The `useEffect` cleanup runs.
2. Scroll position is saved to `posRef`.
3. `rowsRef.current.clear()` drops all portal tracking.
4. `contentEl.textContent = ''` wipes the engine's rendered DOM.
5. `instance.detachScrollbar(container)` removes the native scrollbar element.
6. `instance.dispose()` tears down all engine event listeners and observers.

### Engine Recreation (item count change)

When `totalDep` (the effective item count) changes, the cleanup above runs, then the effect body runs again. The new engine restores the scroll position from `posRef`, then schedules the first render.

---

## Modifying the Render Pipeline

The render pipeline lives entirely in the `render` callback returned by `useCeriousScroll`. It is a `useCallback` with an empty dependency array — all state is accessed through refs.

**Adding a pre-render hook** (e.g. clearing a selection):

```typescript
const render = useCallback((): MeasuredViewportRange | null => {
  // add pre-render logic here
  preRenderHookRef.current?.();
  const host = hostRef.current;
  // ...rest of existing render body
}, []);
```

**Changing how rows are measured**: the static HTML phase uses `renderToStaticMarkup`. If you need the measurement to reflect CSS that is only applied in a full React render (e.g. a theme class on a context provider), you would need to add that class to the mount node before `renderToStaticMarkup` runs, or accept a small measurement error corrected by the content observer.

**Adding row-level metadata**: the `rowsRef` map value is `{ el, mount }`. You can extend the `RowEntry` interface with additional fields (e.g. measured height, selected state) and set them in the `ElementRenderer` callback.

---

## Adding New Imperative Methods

The imperative API surface is defined in two places:

1. `UseCeriousScrollResult` (interface in `use-cerious-scroll.tsx`) — returned by the hook.
2. `CeriousScrollHandle` (interface in `cerious-scroll.tsx`) — exposed via `useImperativeHandle`.

**Steps to add a new method** (example: `scrollToTop`):

1. Add the method to the hook:

```typescript
// use-cerious-scroll.tsx
const scrollToTop = useCallback((): MeasuredViewportRange | null => {
  if (!hostRef.current) return null;
  hostRef.current.scroller.reset();
  return render();
}, [render]);

// Add to UseCeriousScrollResult interface
scrollToTop: () => MeasuredViewportRange | null;

// Return it from useCeriousScroll
return { containerRef, portals, scroller, render, jumpToElement, scrollToPercentage, reset, recalculate, scrollToTop };
```

2. Add it to the component handle:

```typescript
// cerious-scroll.tsx
export interface CeriousScrollHandle {
  // ...existing
  scrollToTop(): MeasuredViewportRange | null;
}

// Inside CeriousScrollInner, add to useImperativeHandle deps and object:
const { ..., scrollToTop } = useCeriousScroll<TItem>(hookOptions);
useImperativeHandle(ref, () => ({ ..., scrollToTop }), [..., scrollToTop]);
```

---

## Props That Recreate the Engine vs Props That Don't

Understanding which prop changes recreate the engine is important for performance:

| Prop | Change behavior |
|---|---|
| `totalElements` / `items.length` | **Recreates engine** — `useEffect([totalDep])` |
| `items` (same length, new reference) | Re-renders via `useEffect([opts.items])` — engine reused |
| `getItem` (new reference) | Re-renders via `useEffect([opts.getItem])` — engine reused |
| `renderItem` (new reference) | Picked up via `renderItemRef.current` — no re-effect at all |
| `options` | Stored in `optionsRef` — **no effect**; remount to change engine options |
| `autoRender` | Stored in `autoRenderRef` — **no effect** — takes effect on next render pass |
| `onViewportChange` / `onMeasuredViewport` / `onReady` | Stored in refs — **no effect** |

---

## Testing

Tests live in `test/cerious-scroll.test.tsx`. The suite uses Vitest + `@testing-library/react`.

**Running tests:**

```bash
npm test          # watch mode
npm run test:run  # CI / single pass
```

**Key testing patterns:**

```typescript
// Render the component with a fixed-height container
render(
  <div style={{ height: 400 }}>
    <CeriousScroll
      items={items}
      renderItem={(item) => <div style={{ height: 40 }}>{item.name}</div>}
    />
  </div>
);

// Access the imperative handle
const ref = createRef<CeriousScrollHandle>();
render(<CeriousScroll ref={ref} items={items} renderItem={...} style={{ height: 400 }} />);
act(() => ref.current?.jumpToElement(100));
```

**Mocking the engine:** The engine is imported as `@ceriousdevtech/cerious-scroll`. In unit tests that should not hit real DOM measurement, mock it at the module level:

```typescript
vi.mock('@ceriousdevtech/cerious-scroll', () => ({
  CeriousScroll: vi.fn().mockImplementation(() => ({
    renderViewport: vi.fn(() => ({ startElement: 0, endElement: 10 })),
    getRenderedIndices: vi.fn(() => []),
    currentElement: 0,
    scrollOffset: 0,
    dispose: vi.fn(),
    detachScrollbar: vi.fn(),
  })),
}));
```

---

## Common Pitfalls

### `options` changes after mount have no effect

`options` is consumed at engine creation. To apply new engine options, use a `key` prop to force a remount:

```tsx
<CeriousScroll key={optionVersion} options={options} ... />
```

### `recalculate()` is expensive — use it only for bulk height changes

`recalculate()` clears the height cache and re-measures every visible row synchronously (one `offsetHeight` per row). It is intended for layout switches that change every row at once (e.g. density, font size). Do **not** call it on routine item edits — the engine's `ResizeObserver` handles incidental height changes on its own.

### Changing `items` without changing the length does not re-measure row heights

This is intentional. Mutating item content without changing the count is a re-render (React patches the portal), not a layout change. Heights stay cached. If you know your edit changed a row's height, the engine's `ResizeObserver` will detect the change automatically — you do not need to call `recalculate()`.

### `flushSync` inside an existing React render is a no-op

If another component is rendering when the scroll event fires, `flushSync` silently becomes async. This means portals fill on the next commit instead of synchronously. For most scrolling scenarios this is invisible. During a rapid scrollbar drag the rows may appear blank for one frame — this is the correct behavior, not a bug.

### The container must have an explicit height

Without a CSS height, `container.clientHeight` is 0 and `renderViewport` renders 0 elements. Set a height via `style={{ height: 400 }}`, `className` with a CSS rule, or make the parent a flex/grid container with a bounded dimension.

---

## Build and Release

```bash
# Library build (outputs to dist/)
npm run build

# Demo dev server (http://localhost:5173)
npm run demo

# Demo production build (outputs to demo/dist/)
npm run demo:build

# Demo build for GitHub Pages (base path required)
npm run demo:build -- --base=/react-cerious-scroll/
```

The library is built with Vite in library mode. `vite-plugin-dts` generates `.d.ts` files. Entry point is `src/index.ts`.

The demo (`demo/`) imports the library by package name via a Vite alias that points to `src/`, so local source changes are reflected live without a build step.
