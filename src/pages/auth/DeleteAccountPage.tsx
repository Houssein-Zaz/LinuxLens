import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { FormError, TextField } from '../../components/auth/FormFields';
import { useAuth } from '../../hooks/useAuth';
import { useTr } from '../../i18n';


/** Suppression définitive du compte, ouverte depuis le menu du compte. */
export function DeleteAccountPage() {
  const { backend, user } = useAuth();
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string>();
  const tr = useTr();
  const DELETE_WORD = tr('SUPPRIMER', 'DELETE');

  return (
    <AuthCard
      title={tr('Supprimer mon compte', 'Delete my account')}
      subtitle={user && <>{tr('Compte :', 'Account:')} <strong className="font-medium text-zinc-900 dark:text-zinc-100">{user.email}</strong></>}
      footer={
        <Link to="/compte" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          ← {tr('Retour à mon compte', 'Back to my account')}
        </Link>
      }
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await backend.auth.deleteAccount();
          if (r.error) setError(r.error);
          else navigate('/', { replace: true });
        }}
      >
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-900 dark:bg-red-400/10 dark:text-red-200">
          {tr(
            'Votre compte, votre progression, vos résultats, vos favoris et votre historique seront',
            'Your account, progress, results, favorites and history will be',
          )}{' '}
          <strong>{tr('définitivement supprimés', 'permanently deleted')}</strong>. {tr('Tapez', 'Type')}{' '}
          <strong className="font-mono">{DELETE_WORD}</strong> {tr('pour confirmer.', 'to confirm.')}
        </p>
        <TextField label={tr('Confirmation', 'Confirmation')} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        <FormError>{error}</FormError>
        <button
          type="submit"
          disabled={typed !== DELETE_WORD}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {tr('Supprimer définitivement', 'Delete permanently')}
        </button>
      </form>
    </AuthCard>
  );
}
