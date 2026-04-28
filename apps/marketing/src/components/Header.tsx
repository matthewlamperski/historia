import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/download', label: 'Download' },
  { to: '/blog', label: 'Blog' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-primary-100/70 bg-cream/85 backdrop-blur supports-[backdrop-filter]:bg-cream/70">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <Logo size={32} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-primary-800 hover:bg-primary-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/download" className="ml-2 btn-primary py-2 px-4 text-sm">
            Get the app
          </Link>
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary-800 hover:bg-primary-100"
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            aria-hidden="true"
          >
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-primary-100 bg-cream md:hidden">
          <div className="container-wide flex flex-col gap-1 py-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-base font-medium transition ${
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-primary-800 hover:bg-primary-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/download"
              onClick={() => setOpen(false)}
              className="btn-primary mt-2 w-full"
            >
              Get the app
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
