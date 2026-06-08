/**
 * Single source of truth for the demo gallery: each entry drives both a gallery
 * card and a route. Add a demo here and it shows up everywhere.
 */
import type { ReactElement } from 'react';

import { BasicDemo } from './demos/BasicDemo';
import { ComparisonDemo } from './demos/ComparisonDemo';
import { DataGridDemo } from './demos/DataGridDemo';
import { TableDemo } from './demos/TableDemo';
import { ChatDemo } from './demos/ChatDemo';
import { LogViewerDemo } from './demos/LogViewerDemo';
import { CodeViewerDemo } from './demos/CodeViewerDemo';
import { EcommerceDemo } from './demos/EcommerceDemo';
import { FinanceDemo } from './demos/FinanceDemo';
import { GitHistoryDemo } from './demos/GitHistoryDemo';
import { SqlResultsDemo } from './demos/SqlResultsDemo';

export interface DemoMeta {
  slug: string;
  title: string;
  emoji: string;
  blurb: string;
  element: ReactElement;
}

export const DEMOS: DemoMeta[] = [
  {
    slug: 'comparison',
    title: 'vs react-window',
    emoji: '⚔️',
    blurb: 'Side-by-side stress test against react-window across 5 scenarios: dynamic heights, expanding rows, async images, millions of rows, and continuous updates.',
    element: <ComparisonDemo />,
  },
  {
    slug: 'basic',
    title: 'Basic / Vanilla',
    emoji: '🧱',
    blurb: 'Configurable dataset size (up to 1,000,000), fixed/variable heights, jump-to-row and live stats.',
    element: <BasicDemo />,
  },
  {
    slug: 'data-grid',
    title: 'Data Grid',
    emoji: '📊',
    blurb: 'Multi-column grid with sortable headers, live search, and Ctrl/Cmd multi-select.',
    element: <DataGridDemo />,
  },
  {
    slug: 'table',
    title: 'Native Table',
    emoji: '🧮',
    blurb: "Real <table>/<tr>/<td> rows via layout:'table' — frozen header, aligned columns, single tbody transform. Virtualizes millions of rows with ~25 DOM rows.",
    element: <TableDemo />,
  },
  {
    slug: 'chat',
    title: 'Chat Messages',
    emoji: '💬',
    blurb: 'Variable-height message bubbles, sent/received styling, and auto-scroll on send.',
    element: <ChatDemo />,
  },
  {
    slug: 'log-viewer',
    title: 'Log Viewer',
    emoji: '📜',
    blurb: 'System logs with level filtering, live search, and color-coded severities.',
    element: <LogViewerDemo />,
  },
  {
    slug: 'code-viewer',
    title: 'Code Viewer',
    emoji: '👨‍💻',
    blurb: 'Syntax-highlighted source with line numbers and find-in-file jump.',
    element: <CodeViewerDemo />,
  },
  {
    slug: 'ecommerce',
    title: 'E-commerce',
    emoji: '🛍️',
    blurb: 'Product catalog with ratings, prices, stock state, and an add-to-cart counter.',
    element: <EcommerceDemo />,
  },
  {
    slug: 'finance',
    title: 'Financial Trading',
    emoji: '📈',
    blurb: 'Real-time stock ticker with streaming prices, % change, and sparklines.',
    element: <FinanceDemo />,
  },
  {
    slug: 'git-history',
    title: 'Git History',
    emoji: '🌿',
    blurb: 'Commit log with authors, branches, and click-to-expand changed files (variable height).',
    element: <GitHistoryDemo />,
  },
  {
    slug: 'sql-results',
    title: 'SQL Results',
    emoji: '🗄️',
    blurb: 'Query result viewer with column headers, status badges, and row selection.',
    element: <SqlResultsDemo />,
  },
];
