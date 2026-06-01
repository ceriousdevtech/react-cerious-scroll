import { Link, Outlet, useLocation } from 'react-router-dom';

import { FpsMeter } from './FpsMeter';

export function Layout() {
  const onGallery = useLocation().pathname === '/';
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="topbar__brand" to="/">
          CeriousScroll <small>React demos</small>
        </Link>
        <div className="topbar__spacer" />
        <FpsMeter />
        {!onGallery && (
          <Link className="topbar__link" to="/">
            ← All demos
          </Link>
        )}
        <a
          className="topbar__link"
          href="https://www.npmjs.com/package/@ceriousdevtech/react-cerious-scroll"
          target="_blank"
          rel="noreferrer"
        >
          npm ↗
        </a>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
