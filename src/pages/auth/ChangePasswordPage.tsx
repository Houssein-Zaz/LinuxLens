import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { FormError, FormSuccess, PasswordField } from '../../components/auth/FormFields';
import { buttonClass } from '../../components/practice/Feedback';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { PASSWORD_MIN_LENGTH, validatePassword } from '../../lib/backend/validation';

/** Changement du mot de passe d'un utilisateur connecté, ouvert depuis le menu du compte. */
export function ChangePasswordPage() {
  const { backend } = useAuth();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [confirm, confirmDialog] = useConfirm();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const invalid = validatePassword(password) ?? (again !== password ? 'Les deux mots de passe ne correspondent pas.' : undefined);
    if (invalid) return setMessage({ ok: false, text: invalid });
    const ok = await confirm({
      title: 'Changer votre mot de passe ?',
      message: 'L’ancien mot de passe ne fonctionnera plus : utilisez le nouveau à votre prochaine connexion.',
      confirmLabel: 'Changer le mot de passe',
    });
    if (!ok) return;
    const r = await backend.auth.updatePassword(password);
    setMessage(r.error ? { ok: false, text: r.error } : { ok: true, text: 'Mot de passe modifié.' });
    if (!r.error) {
      setPassword('');
      setAgain('');
    }
  };

  return (
    <AuthCard
      title="Changer le mot de passe"
      subtitle="Choisissez un nouveau mot de passe pour vous connecter."
      footer={
        <Link to="/compte" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          ← Retour à mon compte
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {message && (message.ok ? <FormSuccess>{message.text}</FormSuccess> : <FormError>{message.text}</FormError>)}
        <PasswordField
          label="Nouveau mot de passe"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères, dont une lettre et un chiffre.`}
        />
        <PasswordField label="Confirmer le mot de passe" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        <button type="submit" className={`${buttonClass.primary} w-full justify-center`} disabled={!password}>
          Changer le mot de passe
        </button>
      </form>
      {confirmDialog}
    </AuthCard>
  );
}
