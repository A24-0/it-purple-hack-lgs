import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './AiChatPage.module.css';

const chatModes = [
  {
    id: 'general',
    title: 'Универсальный',
    subtitle: 'общие вопросы',
    context:
      'Ты страховой помощник для подростков. Отвечай кратко и практично: риск, покрытие, что делать, какой полис.',
    presets: ['Что делать, если разбил телефон?', 'Как понять, что случай страховой?', 'Что важно в договоре?'],
  },
  {
    id: 'travel',
    title: 'Поездки',
    subtitle: 'агент путешествий',
    context:
      'Ты эксперт по travel-страхованию. Давай конкретные советы по медицине в поездке, багажу, активностям, документам.',
    presets: ['Я лечу в Турцию, что мне застраховать?', 'Заболел за границей: какой порядок действий?', 'Потеряли багаж: как оформить выплату?'],
  },
  {
    id: 'gadget',
    title: 'Техника',
    subtitle: 'агент гаджетов',
    context:
      'Ты эксперт по страхованию техники. Объясняй риски кражи, падения, воды, франшизы и ограничения по полисам.',
    presets: ['Уронил телефон в воду: будет выплата?', 'Что выбрать: гарантия или страховка?', 'Как застраховать ноутбук для учебы?'],
  },
  {
    id: 'health',
    title: 'Здоровье',
    subtitle: 'агент здоровья',
    context:
      'Ты эксперт по медицинским и НС полисам. Отвечай с фокусом на подростков, спорт, травмы, поездки и нужные документы.',
    presets: ['Какая страховка нужна для спорта?', 'Травма на катке: это страховой случай?', 'Как быстро собрать документы на выплату?'],
  },
] as const;

export default function AiChatPage() {
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const [input, setInput] = useState('');
  const [modeId, setModeId] = useState<(typeof chatModes)[number]['id']>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeMode = useMemo(() => chatModes.find((m) => m.id === modeId) ?? chatModes[0], [modeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || state.chatLoading) return;
    setInput('');
    actions.sendChatMessage(text, activeMode.context);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text: string) => {
    actions.sendChatMessage(text, activeMode.context);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className={styles.headerCenter}>
          <div>
            <span className={styles.headerTitle}>Справка</span>
            <span className={styles.headerStatus}>{activeMode.subtitle}</span>
          </div>
        </div>
        <div style={{ width: 44 }} />
      </div>

      <div className={styles.modes}>
        {chatModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`${styles.modeChip} ${mode.id === modeId ? styles.modeChipActive : ''}`}
            onClick={() => setModeId(mode.id)}
          >
            {mode.title}
          </button>
        ))}
      </div>

      <div className={styles.messages}>
        {state.chatMessages.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyBadge} aria-hidden />
            <h3 className={styles.emptyTitle}>Задай вопрос своими словами</h3>
            <p className={styles.emptyText}>
              Коротко опиши ситуацию или термин — подсказка придёт с сервера. Это не «чат с нейросетью» в
              стиле мессенджера, а помощник по материалам курса.
            </p>
          </div>
        )}

        {state.chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.row} ${msg.role === 'user' ? styles.rowUser : styles.rowAssistant}`}
          >
            <div className={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}>
              <p className={styles.bubbleText}>{msg.text}</p>
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
          <div className={`${styles.row} ${styles.rowAssistant}`}>
            <div className={styles.bubbleAssistant}>
              <div className={styles.typing}>
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {state.chatMessages.length === 0 && (
        <div className={styles.suggestions}>
          {activeMode.presets.map((s) => (
            <button key={`preset-${s}`} type="button" className={styles.suggestionChip} onClick={() => handleSuggestion(s)}>
              {s}
            </button>
          ))}
          {state.suggestions.map((s) => (
            <button key={s} type="button" className={styles.suggestionChip} onClick={() => handleSuggestion(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className={styles.inputBar}>
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Например: что такое франшиза?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim() || state.chatLoading}
          aria-label="Отправить"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
