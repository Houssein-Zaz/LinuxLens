import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { FormError, FormSuccess, PasswordField, SubmitButton } from '../../components/auth/FormFields';
import { useAuth } from '../../hooks/useAuth';
import { useTr } from '../../i18n';
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
  const tr = useTr();

  if (loading) return <p className="text-zinc-500">{tr('Chargement…', 'Loading…')}</p>;

  if (!user) {
    return (
      <AuthCard title={tr('Lien invalide ou expiré', 'Invalid or expired link')}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {tr('Ce lien de réinitialisation n’est plus valable.', 'This reset link is no longer valid.')}{' '}
          <Link to="/mot-de-passe-oublie" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            {tr('Demander un nouveau lien', 'Request a new link')}
          </Link>
        </p>
      </AuthCard>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const invalid = validatePassword(password) ?? (confirm !== password ? tr('Les deux mots de passe ne correspondent pas.', 'The two passwords do not match.') : undefined);
    if (invalid) return setError(invalid);
    setPending(true);
    const result = await backend.auth.updatePassword(password);
    setPending(false);
    if (result.error) setError(result.error);
    else setDone(true);
  };

  return (
    <AuthCard title={tr('Nouveau mot de passe', 'New password')}>
      {done ? (
        <FormSuccess>
          {tr('Mot de passe modifié.', 'Password changed.')}{' '}
          <Link to="/compte" className="font-medium underline underline-offset-2">
            {tr('Aller à mon compte', 'Go to my account')}
          </Link>
        </FormSuccess>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError>{error}</FormError>
          <PasswordField
            label={tr('Nouveau mot de passe', 'New password')}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={tr(
              `Au moins ${PASSWORD_MIN_LENGTH} caractères, dont une lettre et un chiffre.`,
              `At least ${PASSWORD_MIN_LENGTH} characters, including a letter and a digit.`,
            )}
          />
          <PasswordField label={tr('Confirmer', 'Confirm')} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <SubmitButton pending={pending}>{tr('Enregistrer', 'Save')}</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
