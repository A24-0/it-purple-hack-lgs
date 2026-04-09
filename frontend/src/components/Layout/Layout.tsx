import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import styles from './Layout.module.css';
import sidebarStyles from './Sidebar.module.css';
import navStyles from './BottomNav.module.css';
import { IconBook, IconChart, IconGames, IconHome, IconLab, IconSettings, IconShield, IconUser } from '../ui/NavIcons';

const navItems = [
  { path: '/', Icon: IconHome, label: 'Главная' },
  { path: '/games', Icon: IconGames, label: 'Игры' },
  { path: '/progress', Icon: IconChart, label: 'Прогресс' },
  { path: '/lab', Icon: IconLab, label: 'Лаборатория' },
  { path: '/dictionary', Icon: IconBook, label: 'Словарь' },
  { path: '/profile', Icon: IconUser, label: 'Профиль' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <aside className={sidebarStyles.sidebar}>
        <div className={sidebarStyles.logo}>
          <span className={sidebarStyles.logoIcon}>
            <IconShield size={26} />
          </span>
          <span className={sidebarStyles.logoText}>СтрахоГид</span>
        </div>
        <nav className={sidebarStyles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`${sidebarStyles.navItem} ${location.pathname === item.path ? sidebarStyles.active : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className={sidebarStyles.navIcon}>
                <item.Icon size={22} />
              </span>
              <span className={sidebarStyles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className={sidebarStyles.bottomSection}>
          <button type="button" className={sidebarStyles.navItem} onClick={() => navigate('/settings')}>
            <span className={sidebarStyles.navIcon}>
              <IconSettings size={22} />
            </span>
            <span className={sidebarStyles.navLabel}>Настройки</span>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={navStyles.nav} aria-label="Основное меню">
        {navItems.map((item) => (
          <button
            key={item.path}
            type="button"
            className={`${navStyles.tab} ${location.pathname === item.path ? navStyles.active : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className={navStyles.tabIcon}>
              <item.Icon size={24} />
            </span>
            <span className={navStyles.label}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
