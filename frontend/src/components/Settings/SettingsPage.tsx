import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { isTelegramWebApp } from '../../api/telegram';
import { progressApi } from '../../api/endpoints';
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '../../config/app';
import { loadAppPrefs, saveAppPrefs } from '../../utils/appPreferences';
import styles from './SettingsPage.module.css';

type SettingsPageProps = { embedded?: boolean };

type ModalId = 'language' | 'about' | 'privacy' | 'reset' | null;

const PRIVACY_TEXT = `Мы обрабатываем только те данные, которые ты указываешь при регистрации и использовании приложения (имя, email, прогресс обучения, опционально Telegram при привязке).

Данные хранятся на сервере проекта в рамках хакатона и используются для работы игр, сценариев и личного кабинета. Мы не продаём персональные данные третьим лицам.

Выход из аккаунта и сброс прогресса описаны в настройках. По вопросам обращайся к организаторам демо-версии.`;

export default function SettingsPage({ embedded = false }: SettingsPageProps) {
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const userProgress = state.progress;
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [modal, setModal] = useState<ModalId>(null);
  const [resetBusy, setResetBusy] = useState(false);

  // Profile edit
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(state.user?.name || '');
  const [editEmail, setEditEmail] = useState(state.user?.email || '');
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
      setEditEmail(state.user?.email || '');
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isEditingProfile, state.user?.name, state.user?.email]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const p = loadAppPrefs();
    setNotifications(p.pushNotifications);
    setDailyReminder(p.dailyReminder);
    setSoundEffects(p.soundEffects);
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
    const email = editEmail.trim();
    const payload: { name?: string; email?: string } = {};
    if (name) payload.name = name;
    if (email) payload.email = email;
    if (Object.keys(payload).length === 0) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      await actions.updateProfile(payload);
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

  const handleLogout = () => {
    actions.logout();
    navigate('/login', { replace: true });
  };

  const handleExportProgress = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: APP_NAME,
      user: state.user,
      progress: state.progress,
      achievements: state.achievements,
      note: 'Копия для просмотра. Импорт этого файла в приложение не предусмотрен.',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingoskids-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const confirmResetProgress = async () => {
    setResetBusy(true);
    try {
      await progressApi.reset();
      await actions.refreshSessionData();
      setModal(null);
    } catch (e) {
      window.alert((e as Error).message || 'Не удалось сбросить прогресс');
    } finally {
      setResetBusy(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`${styles.page} ${embedded ? styles.embedded : ''}`}>
      {!embedded && (
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
      )}

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
          {state.user?.email ? (
            <span className={styles.profileEmail}>{state.user.email}</span>
          ) : null}
          <span className={styles.profileLevel}>
            Уровень {userProgress.level} · {userProgress.xp} оч. опыта
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
            autoComplete="name"
          />
          <p className={styles.editProfileLabel}>Email</p>
          <input
            className={styles.editProfileInput}
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveProfile(); if (e.key === 'Escape') setIsEditingProfile(false); }}
            maxLength={255}
            placeholder="email@example.com"
            autoComplete="email"
          />
          {profileError && <p className={styles.editProfileError}>{profileError}</p>}
          <div className={styles.editProfileActions}>
            <button
              className={styles.saveBtn}
              onClick={() => void handleSaveProfile()}
              disabled={savingProfile || (!editName.trim() && !editEmail.trim())}
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
                <span className={styles.settingIcon}>Т</span>
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
                  {linkingTg ? '...' : 'Привязать'}
                </button>
              )}
            </div>

            {/* Link by code — shown when not linked and not in TG WebApp */}
            {!state.user?.telegramLinked && (
              <>
                <div className={styles.divider} />
                <div className={styles.settingRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingIcon}>К</span>
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
            <button type="button" className={styles.settingRow} onClick={() => navigate('/telegram')}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>Г</span>
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
                <span className={styles.settingIcon}>У</span>
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
                  onChange={() => {
                    const v = !notifications;
                    setNotifications(v);
                    saveAppPrefs({ pushNotifications: v });
                  }}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.divider} />

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>Д</span>
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
                  onChange={() => {
                    const v = !dailyReminder;
                    setDailyReminder(v);
                    saveAppPrefs({ dailyReminder: v });
                  }}
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
                <span className={styles.settingIcon}>З</span>
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
                  onChange={() => {
                    const v = !soundEffects;
                    setSoundEffects(v);
                    saveAppPrefs({ soundEffects: v });
                  }}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.divider} />

            <button type="button" className={styles.settingRow} onClick={() => setModal('language')}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>Я</span>
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
            <button type="button" className={styles.settingRow} onClick={handleExportProgress}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>Э</span>
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

            <button type="button" className={styles.settingRow} onClick={() => setModal('reset')}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>С</span>
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
            <button type="button" className={styles.settingRow} onClick={() => setModal('about')}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>О</span>
                <div>
                  <span className={styles.settingTitle}>Приложение {APP_NAME}</span>
                  <span className={styles.settingDesc}>Версия 1.0.0</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 6L15 12L9 18" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className={styles.divider} />

            <button type="button" className={styles.settingRow} onClick={() => setModal('privacy')}>
              <div className={styles.settingInfo}>
                <span className={styles.settingIcon}>П</span>
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

        <div className={styles.settingsSection}>
          <h3 className={styles.sectionLabel}>Аккаунт</h3>
          <div className={styles.settingsGroup}>
            <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </div>

      {modal && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={() => {
            if (!resetBusy) setModal(null);
          }}
        >
          <div
            className={styles.modalBox}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {modal === 'language' && (
              <>
                <h2 id="settings-modal-title" className={styles.modalTitle}>
                  Язык интерфейса
                </h2>
                <p className={styles.modalBody}>
                  Сейчас доступен только <strong>русский</strong>. Другие языки можно добавить в следующих версиях.
                </p>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.modalBtnGhost} onClick={() => setModal(null)}>
                    Понятно
                  </button>
                </div>
              </>
            )}
            {modal === 'about' && (
              <>
                <h2 id="settings-modal-title" className={styles.modalTitle}>
                  {APP_NAME}
                </h2>
                <p className={styles.modalBody}>
                  Версия <strong>1.0.0</strong>
                  <br />
                  <br />
                  {APP_TAGLINE}
                  <br />
                  <br />
                  {APP_DESCRIPTION}
                </p>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.modalBtnPrimary} onClick={() => setModal(null)}>
                    Закрыть
                  </button>
                </div>
              </>
            )}
            {modal === 'privacy' && (
              <>
                <h2 id="settings-modal-title" className={styles.modalTitle}>
                  Политика конфиденциальности
                </h2>
                <p className={styles.modalBody} style={{ whiteSpace: 'pre-line' }}>
                  {PRIVACY_TEXT}
                </p>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.modalBtnPrimary} onClick={() => setModal(null)}>
                    Закрыть
                  </button>
                </div>
              </>
            )}
            {modal === 'reset' && (
              <>
                <h2 id="settings-modal-title" className={styles.modalTitle}>
                  Сбросить прогресс?
                </h2>
                <p className={styles.modalBody}>
                  На сервере будут удалены пройденные сценарии, результаты мини-игр и позиция в таблице лидеров. Монеты
                  и серия дней обнулятся. Отменить это действие нельзя.
                </p>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalBtnGhost}
                    disabled={resetBusy}
                    onClick={() => setModal(null)}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className={styles.modalBtnDanger}
                    disabled={resetBusy}
                    onClick={() => void confirmResetProgress()}
                  >
                    {resetBusy ? 'Сбрасываю…' : 'Сбросить'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <p>
          {APP_NAME} v1.0.0
        </p>
        <p>IT Purple Hack 2026</p>
      </div>
    </div>
  );
}
