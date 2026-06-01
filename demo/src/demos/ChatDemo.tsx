import { useEffect, useRef, useState } from 'react';
import {
  CeriousScroll,
  type CeriousScrollHandle,
} from '@ceriousdevtech/react-cerious-scroll';

import {
  CHAT_BASE,
  ME,
  generateMessage,
  nowTime,
  type ChatMessage,
} from './chat.data';
import './chat.css';

export function ChatDemo() {
  const [sent, setSent] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const ref = useRef<CeriousScrollHandle>(null);

  const total = CHAT_BASE + sent.length;
  const getMessage = (index: number): ChatMessage =>
    index < CHAT_BASE ? generateMessage(index) : sent[index - CHAT_BASE];

  const scrollToLatest = () => {
    requestAnimationFrame(() => ref.current?.scrollToPercentage(100));
  };

  // Start at the newest messages, and follow new ones as they're sent.
  useEffect(scrollToLatest, [sent.length]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setSent((prev) => [
      ...prev,
      { id: CHAT_BASE + prev.length, user: ME, text, time: nowTime(), reactions: [], isSent: true },
    ]);
    setDraft('');
  };

  return (
    <div className="demo-page">
      <div className="demo-page__header">
        <h1>💬 Team Chat</h1>
        <p>{total.toLocaleString()} variable-height messages — send one and it auto-scrolls to the bottom.</p>
      </div>

      <CeriousScroll
        ref={ref}
        className="demo-scroll chat-scroll"
        totalElements={total}
        getItem={getMessage}
        renderItem={(msg) => (
          <div className={`msg${msg.isSent ? ' sent' : ''}`}>
            <div className="msg__avatar" style={{ background: msg.user.color }}>
              {msg.user.emoji}
            </div>
            <div className="msg__body">
              <div className="msg__meta">
                <span className="msg__name">{msg.user.name}</span>
                <span>{msg.time}</span>
              </div>
              <div className="msg__bubble">{msg.text}</div>
              {msg.reactions.length > 0 && (
                <div className="msg__reactions">
                  {msg.reactions.map((r, i) => (
                    <span key={i} className="msg__reaction">
                      {r.emoji} {r.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      />

      <div className="chat-composer">
        <textarea
          rows={1}
          placeholder="Type a message…  (Enter to send, Shift+Enter for newline)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="button" onClick={send} disabled={!draft.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
