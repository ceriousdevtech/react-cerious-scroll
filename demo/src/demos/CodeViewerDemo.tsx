import { useRef, useState } from 'react';
import {
  CeriousScroll,
  type CeriousScrollHandle,
} from '@ceriousdevtech/react-cerious-scroll';

import { CODE_TOTAL, firstMatch, makeLine, tokenize } from './code.data';
import './code.css';

export function CodeViewerDemo() {
  const [find, setFind] = useState('');
  const ref = useRef<CeriousScrollHandle>(null);

  const runFind = () => {
    const i = firstMatch(find);
    if (i >= 0) ref.current?.jumpToElement(i);
  };

  const q = find.trim().toLowerCase();

  return (
    <div className="demo-page">
      <div className="demo-page__header">
        <h1>👨‍💻 Code Viewer</h1>
        <p>{CODE_TOTAL.toLocaleString()} syntax-highlighted lines with line numbers and find.</p>
      </div>

      <div className="demo-toolbar">
        <input
          type="search"
          placeholder="Find in file…"
          value={find}
          onChange={(e) => setFind(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runFind()}
          style={{ flex: 1, minWidth: 220 }}
        />
        <button type="button" onClick={runFind}>
          Find next ↵
        </button>
        <button type="button" onClick={() => ref.current?.reset()}>
          Top
        </button>
        <span className="stat">{CODE_TOTAL.toLocaleString()} lines</span>
      </div>

      <CeriousScroll
        ref={ref}
        className="demo-scroll code-scroll"
        totalElements={CODE_TOTAL}
        getItem={(i) => i}
        renderItem={(i) => {
          const line = makeLine(i);
          const isMatch = q.length > 0 && line.raw.toLowerCase().includes(q);
          return (
            <div className={`code-row${isMatch ? ' match' : ''}`}>
              <span className="code-gutter">{i + 1}</span>
              <span className="code-text">
                {tokenize(line.raw).map((t, k) => (
                  <span key={k} className={`tok-${t.type}`}>
                    {t.text}
                  </span>
                ))}
              </span>
            </div>
          );
        }}
      />
    </div>
  );
}
