import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { FormError, FormSuccess, PasswordField, SubmitButton } from '../../components/auth/FormFields';
import { useAuth } from '../../hooks/useAuth';
import { PASSWORD_MIN_LENGTH, validatePassword } from '../../lib/backend/validation';

/**
 * Page ouverte depuis le lien de réinitialisation reçu par e-mail :
 * Supabase y ouvre une session temporaire qui autorise le changement de mot de passe.
 */
export function ResetPasswordPage() {
  const { backend, user, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (loading) return <p className="text-zinc-500">Chargement…</p>;

  if (!user) {
    return (
      <AuthCard title="Lien invalide ou expiré">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ce lien de réinitialisation n’est plus valable.{' '}
          <Link to="/mot-de-passe-oublie" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Demander un nouveau lien
          </Link>
        </p>
      </AuthCard>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const invalid = validatePassword(password) ?? (confirm !== password ? 'Les deux mots de passe ne correspondent pas.' : undefined);
    if (invalid) return setError(invalid);
    setPending(true);
    const result = await backend.auth.updatePassword(password);
    setPending(false);
    if (result.error) setError(result.error);
    else setDone(true);
  };

  return (
    <AuthCard title="Nouveau mot de passe">
      {done ? (
        <FormSuccess>
          Mot de passe modifié.{' '}
          <Link to="/compte" className="font-medium underline underline-offset-2">
            Aller à mon compte
          </Link>
        </FormSuccess>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError>{error}</FormError>
          <PasswordField
            label="Nouveau mot de passe"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères, dont une lettre et un chiffre.`}
          />
          <PasswordField label="Confirmer" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <SubmitButton pending={pending}>Enregistrer</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
