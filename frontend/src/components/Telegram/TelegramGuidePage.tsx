import { useNavigate } from 'react-router-dom';
import { getTelegramWebApp, isTelegramWebApp } from '../../api/telegram';
import styles from './TelegramGuidePage.module.css';

export default function TelegramGuidePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          ←
        </button>
        <h1 className={styles.title}>Как подключить Telegram</h1>
      </div>

      <div className={styles.card}>
        <h2>Шаг 1</h2>
        <p>Открой бота в Telegram и нажми команду `/app`.</p>
      </div>
      <div className={styles.card}>
        <h2>Шаг 2</h2>
        <p>Запусти мини-приложение через кнопку «Открыть мини-приложение».</p>
      </div>
      <div className={styles.card}>
        <h2>Шаг 3</h2>
        <p>В мини-приложении открой «Настройки → Telegram → Link».</p>
      </div>

      {isTelegramWebApp() && (
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => getTelegramWebApp()?.openLink?.('https://t.me')}
        >
          Открыть Telegram
        </button>
      )}
    </div>
  );
}

