import { Link, NavLink } from 'react-router';
import { ThemeToggle } from './ThemeToggle';
import { AccountButton } from './AccountButton';
import { LanguageToggle } from './LanguageToggle';
import { useTr } from '../../i18n';

const links = (tr: (fr: string, en: string) => string) => [
  { to: '/', label: tr('Expliquer', 'Explain'), short: tr('Expliquer', 'Explain'), end: true },
  { to: '/explorer', label: tr('Explorer', 'Explore'), short: tr('Explorer', 'Explore'), end: false },
  { to: '/ls', label: tr('Analyseur ls -l', 'ls -l analyzer'), short: 'ls -l', end: false },
  { to: '/chmod', label: 'Permissions', short: 'chmod', end: false },
  { to: '/exercices', label: tr('S’exercer', 'Practice'), short: tr('Exos', 'Practice'), end: false },
];

/**
 * Moins de 768 px : deux lignes (logo et actions, puis navigation pleine largeur).
 * Au-delà : une ligne ; libellés complets à partir de 1024 px.
 */
export function Header() {
  const tr = useTr();
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 px-4 pt-2 md:h-14 md:flex-nowrap md:px-6 md:pt-0">
        <Link to="/" className="flex h-10 shrink-0 items-center gap-2 font-semibold tracking-tight md:h-auto">
          <img src="/favicon.svg" alt="" className="size-6" />
          LinuxLens
        </Link>
        <nav
          aria-label={tr('Navigation principale', 'Main navigation')}
          className="order-last -mx-1 flex w-[calc(100%+0.5rem)] gap-0.5 overflow-x-auto pb-2 pt-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:gap-1 md:p-0"
        >
          {links(tr).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              aria-label={l.label}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-2 py-1.5 text-sm transition-colors lg:px-2.5 ${
                  isActive
                    ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`
              }
            >
              <span className="lg:hidden">{l.short}</span>
              <span className="hidden lg:inline">{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
          <LanguageToggle />
          <ThemeToggle />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
