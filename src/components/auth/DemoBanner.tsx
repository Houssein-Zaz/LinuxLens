import { useAuth } from '../../hooks/useAuth';
import { useTr } from '../../i18n';

/** Signale que les comptes ne sont pas encore reliés à une vraie base de données. */
export function DemoBanner({ className = '' }: { className?: string }) {
  const { backend } = useAuth();
  const tr = useTr();
  if (backend.mode !== 'demo') return null;
  return (
    <p role="note" className={`rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3 text-xs text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/5 dark:text-amber-200 ${className}`}>
      <strong className="font-semibold">{tr('Mode démo.', 'Demo mode.')}</strong>{' '}
      {tr(
        'Les comptes et leurs données sont enregistrés uniquement dans ce navigateur : aucune donnée n’est envoyée sur Internet. Ils seront remplacés par de vrais comptes une fois la base de données branchée.',
        'Accounts and their data are stored only in this browser: nothing is sent over the Internet. They will be replaced by real accounts once the database is connected.',
      )}
    </p>
  );
}
