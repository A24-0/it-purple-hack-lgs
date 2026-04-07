import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userProgress } from '../../data/mockData';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
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
          <h1 className={styles.title}>Настройки</h1>
          <div style={{ width: 44 }} />
        </div>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
              fill="#2979FF"
            />
          </svg>
        </div>
        <div className={styles.profileInfo}>
          <span className={styles.profileName}>Артём</span>
          <span className={styles.profileLevel}>
            Уровень {userProgress.level} · {userProgress.xp} XP
          </span>
        </div>
        <button className={styles.editBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"
              fill="#2979FF"
            />
          </svg>
        </button>
      </div>

      <div className={styles.settingsSection}>
        <h3 className={styles.sectionLabel}>Уведомления</h3>
        <div className={styles.settingsGroup}>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}>🔔</span>
              <div>
                <span className={styles.settingTitle}>Push-уведомления</span>
                <span className={styles.settingDesc}>
                  Получать уведомления о новых сценариях
                </span>
              </div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={notifications}
                onChange={() => setNotifications(!notifications)}
              />
              <span className={styles.slider} />
            </label>
          </div>

          <div className={styles.divider} />

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}>⏰</span>
              <div>
                <span className={styles.settingTitle}>Ежедневное напоминание</span>
                <span className={styles.settingDesc}>
                  Напоминание о прохождении сценариев
                </span>
              </div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={dailyReminder}
                onChange={() => setDailyReminder(!dailyReminder)}
              />
              <span className={styles.slider} />
            </label>
          </div>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3 className={styles.sectionLabel}>Приложение</h3>
        <div className={styles.settingsGroup}>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}>🔊</span>
              <div>
                <span className={styles.settingTitle}>Звуковые эффекты</span>
                <span className={styles.settingDesc}>
                  Звуки при прохождении сценариев
                </span>
              </div>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={() => setSoundEffects(!soundEffects)}
              />
              <span className={styles.slider} />
            </label>
          </div>

          <div className={styles.divider} />

          <button className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}>🌍</span>
              <div>
                <span className={styles.settingTitle}>Язык</span>
                <span className={styles.settingDesc}>Русский</span>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6L15 12L9 18"
                stroke="#BDBDBD"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3 className={styles.sectionLabel}>Данные</h3>
        <div className={styles.settingsGroup}>
          <button className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}>📊</span>
              <div>
                <span className={styles.settingTitle}>Экспорт прогресса</span>
                <span className={styles.settingDesc}>
                  Сохранить данные о достижениях
                </span>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6L15 12L9 18"
                stroke="#BDBDBD"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className={styles.divider} />

          <button className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}>🗑️</span>
              <div>
                <span className={styles.settingTitle}>Сбросить прогресс</span>
                <span className={styles.settingDesc}>
                  Начать обучение с начала
                </span>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6L15 12L9 18"
                stroke="#BDBDBD"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3 className={styles.sectionLabel}>О приложении</h3>
        <div className={styles.settingsGroup}>
          <button className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}>ℹ️</span>
              <div>
                <span className={styles.settingTitle}>О СтрахоГиде</span>
                <span className={styles.settingDesc}>Версия 1.0.0</span>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6L15 12L9 18"
                stroke="#BDBDBD"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className={styles.divider} />

          <button className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingIcon}>📝</span>
              <div>
                <span className={styles.settingTitle}>
                  Политика конфиденциальности
                </span>
                <span className={styles.settingDesc}>
                  Как мы используем данные
                </span>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6L15 12L9 18"
                stroke="#BDBDBD"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.footer}>
        <p>СтрахоГид v1.0.0</p>
        <p>IT Purple Hack 2026</p>
      </div>
    </div>
  );
}
