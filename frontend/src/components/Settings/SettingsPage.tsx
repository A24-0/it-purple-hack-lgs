import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { isTelegramWebApp } from '../../api/telegram';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const userProgress = state.progress;
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  // Profile edit
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(state.user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Telegram link by code
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [codeSecondsLeft, setCodeSecondsLeft] = useState(0);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [linkingTg, setLinkingTg] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isEditingProfile) {
      setEditName(state.user?.name || '');
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isEditingProfile, state.user?.name]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCodeTimer = (seconds: number) => {
    setCodeSecondsLeft(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCodeSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setLinkCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSaveProfile = async () => {
    const name = editName.trim();
    if (!name) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      await actions.updateProfile(name);
      setIsEditingProfile(false);
    } catch (e) {
      setProfileError((e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    setCodeError(null);
    try {
      const res = await actions.generateLinkCode();
      setLinkCode(res.code);
      startCodeTimer(res.expires_in);
    } catch (e) {
      setCodeError((e as Error).message || 'Не удалось получить код. Попробуй позже.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleLinkTgWebApp = async () => {
    setLinkingTg(true);
    try {
      await actions.linkTelegram();
    } finally {
      setLinkingTg(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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

      {/* Profile card */}
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
          <span className={styles.profileName}>{state.user?.name || 'Игрок'}</span>
          <span className={styles.profileLevel}>
            Уровень {userProgress.level} · {userProgress.xp} XP
          </span>
        </div>
        {!isEditingProfile && (
          <button className={styles.editBtn} onClick={() => setIsEditingProfile(true)} title="Редактировать профиль">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"
                fill="#2979FF"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Inline profile editor */}
      {isEditingProfile && (
        <div className={styles.editProfileBox}>
          <p className={styles.editProfileLabel}>Имя</p>
          <input
            ref={nameInputRef}
            className={styles.editProfileInput}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveProfile(); if (e.key === 'Escape') setIsEditingProfile(false); }}
            maxLength={128}
            placeholder="Твоё имя"
          />
          {profileError && <p className={styles.editProfileError}>{profileError}</p>}
          <div className={styles.editProfileActions}>
            <button
              className={styles.saveBtn}
              onClick={() => void handleSaveProfile()}
              disabled={savingProfile || !editName.trim()}
            >
              {savingProfile ? 'Сохраняю...' : 'Сохранить'}
            </button>
            <button className={styles.cancelBtn} onClick={() => setIsEditingProfile(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className={styles.sectionsGrid}>

        {/* Telegram section */}
        <div className={styles.settingsSection}>
          <h3 className={styles.sectionLabel}>Аккаунт</h3>
          <div className={styles.settingsGroup}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>T</span>
                <div>
                  <span className={styles.settingTitle}>Telegram</span>
                  <span className={styles.settingDesc}>
                    {state.user?.telegramLinked ? 'Привязан к этому профилю' : 'Не привязан'}
                  </span>
                </div>
              </div>
              {isTelegramWebApp() && !state.user?.telegramLinked && (
                <button
                  className={styles.editBtn}
                  type="button"
                  onClick={() => void handleLinkTgWebApp()}
                  disabled={linkingTg}
                  title="Привязать Telegram"
                >
                  {linkingTg ? '...' : 'Link'}
                </button>
              )}
            </div>

            {/* Link by code — shown when not linked and not in TG WebApp */}
            {!state.user?.telegramLinked && (
              <>
                <div className={styles.divider} />
                <div className={styles.settingRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingIcon}>🔗</span>
                    <div>
                      <span className={styles.settingTitle}>Привязать через код</span>
                      <span className={styles.settingDesc}>
                        Получи код и отправь боту команду&nbsp;
                        <strong>/link КОД</strong>
                      </span>
                    </div>
                  </div>
                  {!linkCode ? (
                    <>
                      <button
                        className={styles.saveBtn}
                        type="button"
                        onClick={() => void handleGenerateCode()}
                        disabled={generatingCode}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {generatingCode ? 'Генерирую...' : 'Получить код'}
                      </button>
                      {codeError && <p className={styles.editProfileError}>{codeError}</p>}
                    </>
                  ) : (
                    <div className={styles.linkCodeBox}>
                      <span className={styles.linkCodeValue}>{linkCode}</span>
                      <span className={styles.linkCodeTimer}>Истекает через {formatTime(codeSecondsLeft)}</span>
                      <p className={styles.linkCodeHint}>
                        Отправь боту: <strong>/link {linkCode}</strong>
                      </p>
                      <button
                        className={styles.cancelBtn}
                        type="button"
                        onClick={() => void handleGenerateCode()}
                        disabled={generatingCode}
                      >
                        Обновить код
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className={styles.divider} />
            <button className={styles.settingRow} onClick={() => navigate('/telegram')}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>G</span>
                <div>
                  <span className={styles.settingTitle}>Гид по Telegram</span>
                  <span className={styles.settingDesc}>Пошагово: бот, mini app и привязка</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h3 className={styles.sectionLabel}>Уведомления</h3>
          <div className={styles.settingsGroup}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>N</span>
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
                <span className={styles.settingIcon}>R</span>
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
                <span className={styles.settingIcon}>S</span>
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
                <span className={styles.settingIcon}>L</span>
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
                <span className={styles.settingIcon}>D</span>
                <div>
                  <span className={styles.settingTitle}>Экспорт прогресса</span>
                  <span className={styles.settingDesc}>
                    Сохранить данные о достижениях
                  </span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 6L15 12L9 18" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className={styles.divider} />

            <button className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>X</span>
                <div>
                  <span className={styles.settingTitle}>Сбросить прогресс</span>
                  <span className={styles.settingDesc}>
                    Начать обучение с начала
                  </span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 6L15 12L9 18" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h3 className={styles.sectionLabel}>О приложении</h3>
          <div className={styles.settingsGroup}>
            <button className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>I</span>
                <div>
                  <span className={styles.settingTitle}>О СтрахоГиде</span>
                  <span className={styles.settingDesc}>Версия 1.0.0</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 6L15 12L9 18" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className={styles.divider} />

            <button className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>P</span>
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
                <path d="M9 6L15 12L9 18" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <p>СтрахоГид v1.0.0</p>
        <p>IT Purple Hack 2026</p>
      </div>
    </div>
  );
}
