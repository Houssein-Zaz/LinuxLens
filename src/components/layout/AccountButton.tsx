import { Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

/** « Connexion » quand on est déconnecté, pastille avec l'initiale quand on est connecté. */
export function AccountButton() {
  const { user, loading } = useAuth();
  if (loading) return <span className="size-9" aria-hidden="true" />;

  if (!user) {
    return (
      <Link
        to="/connexion"
        aria-label="Connexion"
        title="Connexion"
        className="grid h-9 place-items-center rounded-lg px-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <svg viewBox="0 0 24 24" className="size-5 lg:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
        </svg>
        <span className="hidden lg:inline">Connexion</span>
      </Link>
    );
  }

  const initial = (user.displayName || user.email).charAt(0).toUpperCase();
  return (
    <Link
      to="/compte"
      aria-label="Mon compte"
      title={user.displayName ?? user.email}
      className="grid size-8 place-items-center rounded-full bg-indigo-600 text-sm font-semibold text-white ring-2 ring-white transition-transform hover:scale-105 dark:bg-indigo-500 dark:ring-zinc-950"
    >
      {initial}
    </Link>
  );
}
