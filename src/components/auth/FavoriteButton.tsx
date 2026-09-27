import { Link, useLocation } from 'react-router';
import { useFavorites } from '../../hooks/useFavorites';
import { useTr } from '../../i18n';

const base =
  'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors';

/** Ajoute ou retire une commande des favoris ; sans compte, propose de se connecter. */
export function FavoriteButton({ command }: { command: string }) {
  const { isFavorite, toggle, enabled } = useFavorites();
  const location = useLocation();
  const tr = useTr();

  if (!enabled) {
    return (
      <Link
        to={`/connexion?next=${encodeURIComponent(location.pathname)}`}
        className={`${base} border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300`}
        title={tr('Connectez-vous pour enregistrer vos favoris', 'Sign in to save your favorites')}
      >
        <span aria-hidden="true">☆</span> {tr('Ajouter aux favoris', 'Add to favorites')}
      </Link>
    );
  }

  const on = isFavorite(command);
  return (
    <button
      type="button"
      onClick={() => toggle(command)}
      aria-pressed={on}
      className={`${base} ${
        on
          ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200'
          : 'border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300'
      }`}
    >
      <span aria-hidden="true">{on ? '★' : '☆'}</span> {on ? tr('Dans vos favoris', 'In your favorites') : tr('Ajouter aux favoris', 'Add to favorites')}
    </button>
  );
}
