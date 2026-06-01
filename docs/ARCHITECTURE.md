# react-cerious-scroll Architecture

**Copyright (c) 2024-2026 Cerious DevTech LLC. All rights reserved.**

## Table of Contents

1. [Overview](#overview)
2. [Component Hierarchy](#component-hierarchy)
3. [DOM Structure](#dom-structure)
4. [Render Pipeline](#render-pipeline)
5. [Height Measurement Strategy](#height-measurement-strategy)
6. [Lifecycle and Engine Recreation](#lifecycle-and-engine-recreation)
7. [Reactivity Model](#reactivity-model)
8. [Change Detection Boundaries](#change-detection-boundaries)
9. [Key Design Decisions](#key-design-decisions)

---

## Overview

`react-cerious-scroll` is a thin React binding over the `@ceriousdevtech/cerious-scroll` engine. Its only job is to bridge two fundamentally different rendering models:

- **CeriousScroll engine** — imperative, DOM-first, synchronous height measurement, incremental rendering
- **React** — declarative, virtual-DOM diffing, asynchronous commits, concurrent-mode safe

The wrapper solves the core tension between these two models: the engine calls a render callback and immediately reads `offsetHeight` to decide whether the viewport is filled, but React commits are asynchronous. The solution is a **two-phase render**: static HTML for measurement, then live portals for interactivity.

---

## Component Hierarchy

```
<CeriousScroll> (cerious-scroll.tsx)
  └── useCeriousScroll() (use-cerious-scroll.tsx)
        ├── CeriousScrollEngine     (from @ceriousdevtech/cerious-scroll)
        ├── ensureContentElement()  (content-element.ts)
        ├── subscribeViewportChange() (viewport-change.ts)
        └── React portals → row mount nodes inside engine containers
```

`<CeriousScroll>` is a pure wrapper — it calls `useCeriousScroll`, applies `useImperativeHandle` to expose the imperative API via `ref`, and renders a single `<div>` with the portals inside. All logic lives in `useCeriousScroll`.

---

## DOM Structure

```
<div ref={containerRef}   [data-cerious-scroll-content parent]
     style="position:relative; overflow:hidden">
  │
  ├── <div data-cerious-scroll-content>   ← ensureContentElement()
  │     ├── <div>  [engine row container, index 0]
  │     │     └── <div data-cerious-scroll-row="0">  ← mount node
  │     │           └── [React portal renders here]
  │     ├── <div>  [engine row container, index 1]
  │     │     └── <div data-cerious-scroll-row="1">
  │     │           └── [React portal renders here]
  │     └── ...
  │
  └── <div data-cerious-native-scrollbar>  ← managed by engine (if enabled)
```

The `data-cerious-scroll-content` element is created by `ensureContentElement()` and separates row DOM from the native scrollbar DOM. The engine clears row containers with `textContent = ''` during recycling — without this separation, the scrollbar element would be wiped on each render pass.

Each row gets its own inner **mount node** (`data-cerious-scroll-row`). The mount node is what React portals target, keeping React's ownership of the row's DOM separate from the engine's container management.

---

## Render Pipeline

A single render pass works as follows:

```
useCeriousScroll.render()
  │
  ├── 1. Build ElementRenderer callback
  │     └── For each row the engine needs:
  │           a. createElement('div') → mount node
  │           b. mount.innerHTML = renderToStaticMarkup(renderItem(...))
  │              [synchronous static HTML for measurement]
  │           c. el.appendChild(mount)
  │           d. Record in rowsRef: { el, mount }
  │           e. Push to freshMounts[]
  │
  ├── 2. instance.renderViewport(height, contentEl, renderer)
  │     └── Engine calls renderer per row, reads offsetHeight after each
  │         ↳ The static HTML is in the DOM, so offsetHeight is real
  │
  ├── 3. Prune stale rows from rowsRef
  │     └── Remove indices not in instance.getRenderedIndices()
  │
  ├── 4. Clear freshMounts (strip static HTML)
  │     └── mount.textContent = ''
  │        [live portals append; static HTML must not shadow them]
  │
  └── 5. flushSync(forceRender)
        └── React commits all portals synchronously
            ↳ rowsRef rows → createPortal(renderItem(...), mount)
```

**Why `renderToStaticMarkup` then `flushSync`?**

The engine calls the renderer callback and reads `el.offsetHeight` immediately after returning. React portals are committed asynchronously (and `flushSync` is silently dropped in concurrent mode when React is mid-render). There is no way to force a React portal into the DOM in time for that synchronous `offsetHeight` read.

`renderToStaticMarkup` produces plain HTML synchronously — no React tree, no hooks, no event handlers, but the right DOM shape for measurement. After the engine finishes measuring, the static HTML is cleared and `flushSync` commits all interactive portals in one batch. The engine's content observer (`ResizeObserver`) reconciles any small height difference between the static and live versions automatically.

---

## Height Measurement Strategy

| Phase | What renders | Purpose |
|---|---|---|
| Static pass | `renderToStaticMarkup` → `innerHTML` | Synchronous DOM presence for `offsetHeight` measurement |
| Live pass | `flushSync` → React portals | Interactive React tree with hooks, context, event handlers |

Rows that were already rendered in a previous pass (not in `freshMounts`) are not touched during phase 1 — their live portals are already in the DOM and their heights are already cached by the engine. Only newly-introduced rows need the two-phase treatment.

---

## Lifecycle and Engine Recreation

```
useEffect([totalDep])          ← recreates when item count changes
  ├── ensureContentElement()
  ├── new CeriousScrollEngine(...)
  ├── Restore saved scroll position (posRef)
  ├── subscribeViewportChange(...)
  ├── requestAnimationFrame → render()
  └── cleanup:
        ├── cancelAnimationFrame
        ├── unsubscribe events
        ├── Save position to posRef
        ├── rowsRef.current.clear()
        ├── contentEl.textContent = ''
        ├── instance.detachScrollbar()
        └── instance.dispose()

useEffect([opts.items, opts.getItem])   ← re-renders when data identity changes
  └── requestAnimationFrame → render()  (count unchanged, new reference)
```

**`totalDep`** is `opts.totalElements ?? opts.items?.length ?? null`. When it changes the engine is fully recreated because the `ViewportRenderer` inside the engine stores a copy of `totalElements` at construction time; patching the public property alone leaves the renderer's internal bound stale.

**Scroll position** is saved to `posRef` before destruction and restored after recreation, so a data-size change does not lose the user's position.

**`options`** are read once at creation. Passing a new `options` object after mount has no effect. To apply new engine options, remount with a new `key`.

---

## Reactivity Model

All mutable props are stored in always-fresh refs so stable `useCallback` closures always see the current values without being in the dependency array:

```typescript
renderItemRef.current = opts.renderItem;
itemsRef.current     = opts.items ?? null;
getItemPropRef.current = opts.getItem;
autoRenderRef.current = opts.autoRender ?? true;
// ... etc.
```

This prevents the engine from being recreated on every render when callbacks change identity (the common case with inline arrow functions).

**Portals** are collected from `rowsRef` at commit time (inside `forceRender`):

```typescript
// Conceptually (simplified):
portals = [...rowsRef.current.entries()].map(([index, { mount }]) =>
  createPortal(
    renderItemRef.current(getItem(index), index),
    mount
  )
);
```

Because `renderItemRef.current` is always fresh, the portals always call the latest `renderItem` prop, even though the closure capturing them is stable.

---

## Change Detection Boundaries

| Event | Behavior |
|---|---|
| Scroll (wheel/touch/keyboard) | Engine fires `onScroll` hook → `render()` → `flushSync` → React re-renders portals |
| Container resize | Engine's `ResizeController` fires `onScroll` → same path |
| Row content resize | Engine's `ContentObserverManager` detects, updates height cache, fires `onScroll` |
| `items` identity change (same count) | `useEffect([opts.items])` → `requestAnimationFrame → render()` |
| `items.length` change | `useEffect([totalDep])` → full engine recreation |
| `renderItem` prop change | Next render pass picks it up via `renderItemRef.current` (no re-effect) |

---

## Key Design Decisions

### Inner Mount Nodes vs Direct Portals

Early versions targeted the engine's row containers directly with `createPortal(content, el)`. The engine clears those containers during recycling (`el.textContent = ''`), which silently unmounted the React tree living in `el`. Inner mount nodes (`data-cerious-scroll-row`) decouple React ownership from engine container management.

### Per-Row Portals vs Single Portal Batch

All portals are committed in a single `flushSync(forceRender)` call — O(rows) work. Committing portals one-by-one inside the `ElementRenderer` callback would be O(rows²) and would also interleave React commits with the engine's measurement loop.

### `flushSync` Safety

`flushSync` is a no-op when React is already mid-render (concurrent mode). In that case, rows fill on the next commit. The static HTML measurement pass ensures the engine always gets real heights regardless of whether the live commit lands in time.

### No Wrapper-Side ResizeObserver

Container resize is handled by the engine's own `ResizeController`. It observes the container and fires `onScroll`, which flows through the merged options hook and triggers `render()`. Adding a second observer in the wrapper would double-render on every resize event.
