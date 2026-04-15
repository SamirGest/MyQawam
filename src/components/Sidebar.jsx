import { NavLink } from 'react-router-dom';
import { getSettings } from '../data/store';

const navItems = [
  { path: '/', icon: '🏠', label: 'Dashboard' },
  { path: '/objectifs', icon: '🎯', label: 'Objectifs' },
  { path: '/planning', icon: '📅', label: 'Planning' },
  { path: '/parametres', icon: '⚙️', label: 'Paramètres' },
];

export default function Sidebar() {
  const settings = getSettings();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar-desktop">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="MyQawam" className="sidebar-logo-img" />
          <span className="sidebar-logo-text">{settings.appName}</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="bottombar-mobile">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `bottombar-link ${isActive ? 'active' : ''}`}
          >
            <span className="bottombar-icon">{item.icon}</span>
            <span className="bottombar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
