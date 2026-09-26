import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { FormError, FormSuccess, PasswordField, SubmitButton, TextField } from '../../components/auth/FormFields';
import { safeNext } from '../../components/auth/RequireAuth';
import { useAuth } from '../../hooks/useAuth';
import { PASSWORD_MIN_LENGTH, validateEmail, validatePassword } from '../../lib/backend/validation';

const linkClass = 'font-medium text-indigo-600 hover:underline dark:text-indigo-400';

export function SignUpPage() {
  const { backend, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  if (user && !pending) return <Navigate to={next} replace />;

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = {
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm: form.confirm !== form.password ? 'Les deux mots de passe ne correspondent pas.' : undefined,
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setPending(true);
    setError(undefined);
    const result = await backend.auth.signUp(form.email, form.password, form.name);
    setPending(false);
    if (result.error) setError(result.error);
    else if (result.needsConfirmation) setCheckEmail(true);
    else navigate(next, { replace: true });
  };

  if (checkEmail) {
    return (
      <AuthCard title="Vérifiez votre boîte mail">
        <FormSuccess>
          Un lien de confirmation a été envoyé à <strong>{form.email.trim()}</strong>. Cliquez dessus pour activer votre
          compte, puis connectez-vous.
        </FormSuccess>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Pensez à regarder dans les courriers indésirables.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Créer un compte"
      subtitle="Gratuit. Il sert uniquement à sauvegarder votre progression, vos favoris et votre historique."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link to={`/connexion${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className={linkClass}>
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <TextField label="Nom affiché (facultatif)" autoComplete="nickname" maxLength={50} value={form.name} onChange={set('name')} />
        <TextField label="Adresse e-mail" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordField
          label="Mot de passe"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères, dont une lettre et un chiffre.`}
        />
        <PasswordField label="Confirmer le mot de passe" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <SubmitButton pending={pending}>Créer mon compte</SubmitButton>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          En créant un compte, vous acceptez la{' '}
          <Link to="/confidentialite" className="underline underline-offset-2">
            politique de confidentialité
          </Link>
          .
        </p>
      </form>
    </AuthCard>
  );
}
