import { Link, NavLink } from 'react-router';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { to: '/', label: 'Expliquer', short: 'Expliquer', end: true },
  { to: '/explorer', label: 'Explorer', short: 'Explorer', end: false },
  { to: '/ls', label: 'Analyseur ls -l', short: 'ls -l', end: false },
  { to: '/chmod', label: 'Permissions', short: 'chmod', end: false },
  { to: '/exercices', label: 'S’exercer', short: 'Exos', end: false },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <img src="/favicon.svg" alt="" className="size-6" />
          <span className="hidden sm:inline">LinuxLens</span>
        </Link>
        <nav aria-label="Navigation principale" className="flex flex-1 gap-0.5 overflow-x-auto sm:gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              aria-label={l.label}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-1 py-1.5 text-[13px] min-[390px]:px-1.5 sm:px-2.5 sm:text-sm transition-colors ${
                  isActive
                    ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`
              }
            >
              <span className="sm:hidden">{l.short}</span>
              <span className="hidden sm:inline">{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
