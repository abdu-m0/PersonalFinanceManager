import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigation } from '../hooks/useNavigation';

export default function TopNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { main, secondary } = useNavigation();

  const mainNavLinks = main.map((item) => (
    <NavLink
      key={item.name}
      to={item.href}
      className={({ isActive }) =>
        `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      <item.icon size={18} />
      {item.name}
    </NavLink>
  ));

  const secondaryNavLinks = secondary.map((item) => (
    <NavLink
      key={item.name}
      to={item.href}
      className={({ isActive }) =>
        `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      <item.icon size={18} />
      {item.name}
    </NavLink>
  ));

  return (
    <nav className="sticky top-0 z-10 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <span className="text-xl font-semibold">Logo</span>
            </div>
            <div className="hidden items-center gap-4 lg:flex">
              <div className="hidden items-center gap-2 lg:flex">
                {mainNavLinks}
              </div>
              <div className="hidden items-center gap-2 lg:flex">
                {secondaryNavLinks}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="absolute left-0 top-full w-full bg-white shadow-lg lg:hidden">
          <div className="flex flex-col gap-2 p-4">
            {[...main, ...secondary].map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-2.5 text-base font-medium transition ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon size={20} />
                {item.name}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
