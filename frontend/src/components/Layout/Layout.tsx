import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import styles from './Layout.module.css';
import sidebarStyles from './Sidebar.module.css';
import navStyles from './BottomNav.module.css';

const navItems = [
  { path: '/', icon: '🏠', label: 'Главная' },
  { path: '/progress', icon: '📊', label: 'Прогресс' },
  { path: '/dictionary', icon: '📖', label: 'Словарь' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <aside className={sidebarStyles.sidebar}>
        <div className={sidebarStyles.logo}>
          <span className={sidebarStyles.logoIcon}>🛡️</span>
          <span className={sidebarStyles.logoText}>СтрахоГид</span>
        </div>
        <nav className={sidebarStyles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`${sidebarStyles.navItem} ${location.pathname === item.path ? sidebarStyles.active : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className={sidebarStyles.navIcon}>{item.icon}</span>
              <span className={sidebarStyles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className={sidebarStyles.bottomSection}>
          <button
            className={sidebarStyles.navItem}
            onClick={() => navigate('/settings')}
          >
            <span className={sidebarStyles.navIcon}>⚙️</span>
            <span className={sidebarStyles.navLabel}>Настройки</span>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={navStyles.nav}>
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`${navStyles.tab} ${location.pathname === item.path ? navStyles.active : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span>{item.icon}</span>
            <span className={navStyles.label}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
