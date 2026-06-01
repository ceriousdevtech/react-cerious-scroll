import { useState } from 'react';
import { CeriousScroll } from '@ceriousdevtech/react-cerious-scroll';

import { GIT_TOTAL, makeCommit, type GitFile } from './git.data';
import './git.css';

function bars(file: GitFile) {
  const a = Math.min(5, Math.ceil(file.add / 18));
  const d = Math.min(5, Math.ceil(file.del / 12));
  return (
    <span className="commit__bar">
      {Array.from({ length: a }, (_, i) => (
        <i key={`a${i}`} className="a" />
      ))}
      {Array.from({ length: d }, (_, i) => (
        <i key={`d${i}`} className="d" />
      ))}
    </span>
  );
}

export function GitHistoryDemo() {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());

  // Expanding a commit changes its height; the engine's content observer detects
  // it and reflows (re-position + scroll %/scrollbar) on its own — no recalculate.

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="demo-page">
      <div className="demo-page__header">
        <h1>🌿 Commit History</h1>
        <p>{GIT_TOTAL.toLocaleString()} commits — click any commit to expand its changed files.</p>
      </div>

      <CeriousScroll
        className="demo-scroll git-scroll"
        totalElements={GIT_TOTAL}
        getItem={(i) => i}
        renderItem={(i) => {
          const c = makeCommit(i);
          const open = expanded.has(i);
          return (
            <div className="commit" onClick={() => toggle(i)}>
              <div className="commit__row">
                <span className="commit__avatar" style={{ background: c.author.color }}>
                  {c.author.initials}
                </span>
                <span className="commit__main">
                  <div className="commit__msg">{c.message}</div>
                  <div className="commit__sub">
                    <span className="commit__branch">{c.branch}</span>
                    <span>{c.author.name}</span>
                    <span className="commit__hash">{c.hash}</span>
                    <span>· {c.time}</span>
                  </div>
                </span>
                <span className="commit__stat">
                  <span className="git-add">+{c.add}</span> <span className="git-del">−{c.del}</span>
                </span>
              </div>
              {open && (
                <div className="commit__files">
                  {c.files.map((f, k) => (
                    <div key={k} className="commit__file">
                      <span className="commit__file-name">{f.name}</span>
                      <span className="git-add">+{f.add}</span>
                      <span className="git-del">−{f.del}</span>
                      {bars(f)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
