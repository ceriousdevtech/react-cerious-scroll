# @ceriousdevtech/react-cerious-scroll

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://ceriousdevtech.github.io/react-cerious-scroll/)

**React bindings for [Cerious Scroll™](https://www.npmjs.com/package/@ceriousdevtech/cerious-scroll)** — high-performance virtual scrolling with **O(1) memory**, consistent **60 FPS+**, and **native variable-height support with no height estimation**.

Rows are rendered into the engine's own measured containers via React portals and committed synchronously, so every row's real height is measured (never estimated) — exactly the guarantee that makes CeriousScroll precise. Because rows stay in your React tree, **Context / providers work normally**.

---

## Installation

```bash
npm install @ceriousdevtech/react-cerious-scroll @ceriousdevtech/cerious-scroll
```

`react` and `react-dom` (>= 18) are peer dependencies.

---

## Demo

**[Live demo →](https://ceriousdevtech.github.io/react-cerious-scroll/)** — 100,000 rows, fixed/variable-height toggle, imperative jump-to-row, and live viewport stats.

To run locally:

```bash
npm install
npm run demo        # dev server with HMR
npm run demo:build  # production build to demo/dist
```

The demo imports the wrapper by its package name, aliased to the library source,
so edits to `src/` are reflected live.

---

## Quick start (component)

Give the container a height; provide `items` and a `renderItem` render prop.

```tsx
import { CeriousScroll } from '@ceriousdevtech/react-cerious-scroll';

const items = Array.from({ length: 1_000_000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

export function List() {
  return (
    <CeriousScroll
      items={items}
      renderItem={(item, index) => (
        <div className="row">
          {index} — {item.name}
        </div>
      )}
      style={{ height: 480 }}
    />
  );
}
```

Variable heights need no configuration — just render rows of whatever height; the
engine measures each one.

### Without a full array (huge / sparse data)

```tsx
<CeriousScroll
  totalElements={100_000_000}
  getItem={(index) => loadRow(index)}
  renderItem={(row, index) => <Row data={row} index={index} />}
  style={{ height: 600 }}
/>
```

---

## Hook

`useCeriousScroll` gives you full control. Attach `containerRef` to your scroll
element and render `portals` somewhere in your tree (they attach to their own DOM
targets, so placement only affects which React Context they inherit).

```tsx
import { useCeriousScroll } from '@ceriousdevtech/react-cerious-scroll';

function List() {
  const { containerRef, portals } = useCeriousScroll({
    items,
    renderItem: (item, index) => <Row item={item} index={index} />,
  });

  return (
    <div ref={containerRef} style={{ height: 480, position: 'relative', overflow: 'hidden' }}>
      {portals}
    </div>
  );
}
```

---

## Component props

| Prop | Type | Description |
| --- | --- | --- |
| `renderItem` | `(item, index) => ReactNode` | **Required.** Renders one row. `item` is `undefined` if no data source is given. |
| `items` | `readonly TItem[]` | Optional data array. `totalElements` defaults to `items.length`. |
| `totalElements` | `number` | Total item count. Required if `items` is omitted. |
| `getItem` | `(index) => TItem` | Lazy item getter for large/sparse datasets. |
| `tableHeader` | `ReactNode` | Table mode only. A `<tr>` of `<th>`s rendered into the engine's `<thead>` (see [Table layout](#table-layout)). |
| `options` | `CeriousScrollOptions` | Engine options (keyboard/touch/wheel/scrollbar/`layout`/etc.). Read once at creation. |
| `autoRender` | `boolean` | Re-render on scroll/resize/data changes. Default `true`. |
| `onViewportChange` | `(detail) => void` | Normalized viewport-change callback. |
| `onMeasuredViewport` | `(range) => void` | Measured range after each render pass. |
| `onReady` | `(scroller) => void` | The underlying engine instance, once ready. |
| `className` / `style` | — | Applied to the scroll container (set a height!). |

### Imperative handle (via `ref`)

```tsx
const ref = useRef<CeriousScrollHandle>(null);
// ref.current?.jumpToElement(500);
// ref.current?.scrollToPercentage(50);
// ref.current?.reset();
// ref.current?.render();
// ref.current?.recalculate(); // drop cached heights + re-measure (see Notes)
// ref.current?.scroller;      // the raw engine
```

---

## Table layout

Pass `options={{ layout: 'table' }}` to render real `<table>` / `<tr>` / `<td>` rows with a frozen header and native column alignment. Your `renderItem` returns the row's `<td>` cells, and `tableHeader` provides the (declarative, reactive) `<thead>` row:

```tsx
import { TABLE_COLUMNS } from './data';

<CeriousScroll
  className="my-scroll"            // give it a height
  totalElements={100_000}
  getItem={(i) => i}
  options={{ layout: 'table', table: { tableClassName: 'my-table', autoSizeColumns: true } }}
  tableHeader={
    <tr>{TABLE_COLUMNS.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
  }
  renderItem={(index) => {
    const row = makeRow(index);
    return (
      <>
        <td>{row.id}</td>
        <td>{row.name}</td>
        <td>{row.email}</td>
      </>
    );
  }}
/>
```

- **`tableHeader`** is portaled into the engine's `<thead>` — the same `<table>` as the rows, so columns align natively and the header stays frozen.
- **`renderItem` must return `<td>`s** (a fragment of cells). They're rendered into the row's `<tr>` via a `display: contents` wrapper, so React fully owns them and the engine's row recycling can't tear them out.
- **`table.autoSizeColumns`** measures column widths once and pins them — auto-sized but stable (no jitter, no manual widths). Or use `table.columnWidths`. Variable row heights work as usual.
- CSS: `border-collapse: separate` and an **opaque `<thead>` background** (see the core README's [Table Layout](https://github.com/ceriousdevtech/cerious-scroll#-table-layout-layout-table) notes).

---

## Notes

- **No height estimation.** Rows are committed with `flushSync` so the engine
  measures real `offsetHeight`. Later size changes are picked up by the engine's
  built-in `ResizeObserver`.
- **`options` are read at creation.** Changing `options` after mount has no
  effect; remount (e.g. with a `key`) to apply new engine options.
- **Changing the item count** recreates the engine internally (scroll position
  is preserved). Mutating items without changing the count just re-renders the
  content (cheap, and your row state is preserved) — it does **not** discard
  cached heights, so editable grids that produce a new `items` array on every
  edit don't trigger a full viewport re-measure.
- **If every rendered row's height changes at once** (e.g. a density/layout
  switch) the cached heights become stale and rows can misalign until the next
  scroll. Call `recalculate()` (on the `ref`, or from the hook result) right
  after the change to drop the height cache and re-measure. Don't call it on
  routine edits — a single cell edit keeps its row's size, and the engine's
  built-in `ResizeObserver` picks up any incidental resize on its own.

---

## License

Licensed by **Cerious DevTech LLC** under the **MIT License** (see `LICENSE-MIT`).

📧 info@ceriousdevtech.com
