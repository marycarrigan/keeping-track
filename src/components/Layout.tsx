import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Log', icon: '⚡' },
  { to: '/timeline', label: 'Timeline', icon: '📋' },
  { to: '/trends', label: 'Trends', icon: '📊' },
  { to: '/manage', label: 'Manage', icon: '⚙️' },
];

export function Layout() {
  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="flex justify-around max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 text-xs ${
                  isActive ? 'text-primary' : 'text-gray-500'
                }`
              }
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
