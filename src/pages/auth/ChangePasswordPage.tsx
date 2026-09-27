import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { FormError, FormSuccess, PasswordField } from '../../components/auth/FormFields';
import { buttonClass } from '../../components/practice/Feedback';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { useTr } from '../../i18n';
import { PASSWORD_MIN_LENGTH, validatePassword } from '../../lib/backend/validation';

/** Changement du mot de passe d'un utilisateur connecté, ouvert depuis le menu du compte. */
export function ChangePasswordPage() {
  const { backend } = useAuth();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [confirm, confirmDialog] = useConfirm();
  const tr = useTr();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const invalid = validatePassword(password) ?? (again !== password ? tr('Les deux mots de passe ne correspondent pas.', 'The two passwords do not match.') : undefined);
    if (invalid) return setMessage({ ok: false, text: invalid });
    const ok = await confirm({
      title: tr('Changer votre mot de passe ?', 'Change your password?'),
      message: tr(
        'L’ancien mot de passe ne fonctionnera plus : utilisez le nouveau à votre prochaine connexion.',
        'The old password will stop working: use the new one next time you sign in.',
      ),
      confirmLabel: tr('Changer le mot de passe', 'Change password'),
    });
    if (!ok) return;
    const r = await backend.auth.updatePassword(password);
    setMessage(r.error ? { ok: false, text: r.error } : { ok: true, text: tr('Mot de passe modifié.', 'Password changed.') });
    if (!r.error) {
      setPassword('');
      setAgain('');
    }
  };

  return (
    <AuthCard
      title={tr('Changer le mot de passe', 'Change password')}
      subtitle={tr('Choisissez un nouveau mot de passe pour vous connecter.', 'Choose a new password to sign in with.')}
      footer={
        <Link to="/compte" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          ← {tr('Retour à mon compte', 'Back to my account')}
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {message && (message.ok ? <FormSuccess>{message.text}</FormSuccess> : <FormError>{message.text}</FormError>)}
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
        <PasswordField label={tr('Confirmer le mot de passe', 'Confirm password')} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        <button type="submit" className={`${buttonClass.primary} w-full justify-center`} disabled={!password}>
          {tr('Changer le mot de passe', 'Change password')}
        </button>
      </form>
      {confirmDialog}
    </AuthCard>
  );
}
