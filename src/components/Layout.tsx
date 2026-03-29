import { NavLink, Outlet } from 'react-router-dom';
import { Zap, CalendarDays, BarChart3, Settings, Database } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Log', icon: Zap },
  { to: '/timeline', label: 'Timeline', icon: CalendarDays },
  { to: '/trends', label: 'Trends', icon: BarChart3 },
  { to: '/manage', label: 'Manage', icon: Settings },
  { to: '/data', label: 'Data', icon: Database },
];

export function Layout() {
  return (
    <div className="flex flex-col h-dvh bg-base">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="flex justify-around max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 text-xs transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    className={`mb-0.5 ${isActive ? 'drop-shadow-[0_0_6px_var(--color-primary-glow)]' : ''}`}
                  />
                  <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
