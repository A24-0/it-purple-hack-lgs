import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './AiChatPage.module.css';

export default function AiChatPage() {
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || state.chatLoading) return;
    setInput('');
    actions.sendChatMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text: string) => {
    actions.sendChatMessage(text);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className={styles.headerCenter}>
          <span className={styles.aiAvatar}>🤖</span>
          <div>
            <span className={styles.headerTitle}>AI-Помощник</span>
            <span className={styles.headerStatus}>Онлайн</span>
          </div>
        </div>
        <div style={{ width: 44 }} />
      </div>

      <div className={styles.messages}>
        {state.chatMessages.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💬</div>
            <h3 className={styles.emptyTitle}>Спроси меня о страховании!</h3>
            <p className={styles.emptyText}>
              Я помогу разобраться в терминах, объясню как работает страхование и дам подсказки по сценариям.
            </p>
          </div>
        )}

        {state.chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.bubble} ${
              msg.role === 'user' ? styles.userBubble : styles.aiBubble
            }`}
          >
            {msg.role === 'assistant' && (
              <span className={styles.bubbleAvatar}>🤖</span>
            )}
            <div
              className={`${styles.bubbleContent} ${
                msg.role === 'user' ? styles.userContent : styles.aiContent
              }`}
            >
              <p>{msg.text}</p>
              <span className={styles.bubbleTime}>
                {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}

        {state.chatLoading && (
          <div className={`${styles.bubble} ${styles.aiBubble}`}>
            <span className={styles.bubbleAvatar}>🤖</span>
            <div className={`${styles.bubbleContent} ${styles.aiContent}`}>
              <div className={styles.typing}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {state.chatMessages.length === 0 && (
        <div className={styles.suggestions}>
          {state.suggestions.map((s) => (
            <button
              key={s}
              className={styles.suggestionChip}
              onClick={() => handleSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className={styles.inputBar}>
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Задай вопрос..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim() || state.chatLoading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
