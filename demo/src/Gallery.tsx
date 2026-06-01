import { Link } from 'react-router-dom';

import { DEMOS } from './registry';

export function Gallery() {
  return (
    <div className="gallery">
      <p className="gallery__lead">
        High-performance virtual scrolling across real-world UIs — every row is measured (never
        estimated), with O(1) memory. Pick a demo:
      </p>
      <div className="gallery__grid">
        {DEMOS.map((d) => (
          <Link key={d.slug} to={`/${d.slug}`} className="demo-card">
            <div className="demo-card__emoji">{d.emoji}</div>
            <div className="demo-card__title">{d.title}</div>
            <p className="demo-card__blurb">{d.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
