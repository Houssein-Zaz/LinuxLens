import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { FormError, TextField } from '../../components/auth/FormFields';
import { useAuth } from '../../hooks/useAuth';

const DELETE_WORD = 'SUPPRIMER';

/** Suppression définitive du compte, ouverte depuis le menu du compte. */
export function DeleteAccountPage() {
  const { backend, user } = useAuth();
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string>();

  return (
    <AuthCard
      title="Supprimer mon compte"
      subtitle={user && <>Compte : <strong className="font-medium text-zinc-900 dark:text-zinc-100">{user.email}</strong></>}
      footer={
        <Link to="/compte" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          ← Retour à mon compte
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
          Votre compte, votre progression, vos résultats, vos favoris et votre historique seront <strong>définitivement supprimés</strong>.
          Tapez <strong className="font-mono">{DELETE_WORD}</strong> pour confirmer.
        </p>
        <TextField label="Confirmation" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        <FormError>{error}</FormError>
        <button
          type="submit"
          disabled={typed !== DELETE_WORD}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Supprimer définitivement
        </button>
      </form>
    </AuthCard>
  );
}
