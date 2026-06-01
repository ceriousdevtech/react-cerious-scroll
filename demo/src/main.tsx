import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';

// Import base/global styles FIRST so per-demo CSS (pulled in transitively via the
// registry below) is injected after it and can override shared rules of equal
// specificity — e.g. a demo's dark `.code-scroll` background over `.demo-scroll`.
import './app.css';

import { Layout } from './Layout';
import { Gallery } from './Gallery';
import { DEMOS } from './registry';

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Gallery /> },
      ...DEMOS.map((d) => ({ path: d.slug, element: d.element })),
      { path: '*', element: <Gallery /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
