import { Link, NavLink } from 'react-router';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { to: '/', label: 'Expliquer', end: true },
  { to: '/explorer', label: 'Explorer', end: false },
  { to: '/ls', label: 'Analyseur ls -l', end: false },
  { to: '/chmod', label: 'Permissions', end: false },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <img src="/favicon.svg" alt="" className="size-6" />
          <span className="hidden sm:inline">LinuxLens</span>
        </Link>
        <nav aria-label="Navigation principale" className="flex flex-1 gap-1 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
