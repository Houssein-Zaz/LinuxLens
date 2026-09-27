import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { useCaptcha } from '../../components/auth/Captcha';
import { FormError, FormSuccess, PasswordField, SubmitButton, TextField } from '../../components/auth/FormFields';
import { safeNext } from '../../components/auth/RequireAuth';
import { useAuth } from '../../hooks/useAuth';
import { useTr } from '../../i18n';
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
  const captcha = useCaptcha();
  const tr = useTr();

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
      confirm: form.confirm !== form.password ? tr('Les deux mots de passe ne correspondent pas.', 'The two passwords do not match.') : undefined,
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setPending(true);
    setError(undefined);
    const result = await backend.auth.signUp(form.email, form.password, form.name, captcha.token);
    setPending(false);
    if (result.error) {
      setError(result.error);
      captcha.reset();
    }
    else if (result.needsConfirmation) setCheckEmail(true);
    else navigate(next, { replace: true });
  };

  if (checkEmail) {
    return (
      <AuthCard title={tr('Vérifiez votre boîte mail', 'Check your inbox')}>
        <FormSuccess>
          {tr('Un lien de confirmation a été envoyé à', 'A confirmation link has been sent to')} <strong>{form.email.trim()}</strong>.{' '}
          {tr('Cliquez dessus pour activer votre compte, puis connectez-vous.', 'Click it to activate your account, then sign in.')}
        </FormSuccess>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          {tr('Pensez à regarder dans les courriers indésirables.', 'Remember to check your spam folder.')}
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={tr('Créer un compte', 'Create an account')}
      subtitle={tr(
        'Gratuit. Il sert uniquement à sauvegarder votre progression, vos favoris et votre historique.',
        'Free. It is only used to save your progress, favorites and history.',
      )}
      footer={
        <>
          {tr('Déjà inscrit ?', 'Already registered?')}{' '}
          <Link to={`/connexion${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className={linkClass}>
            {tr('Se connecter', 'Sign in')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <TextField label={tr('Nom affiché (facultatif)', 'Display name (optional)')} autoComplete="nickname" maxLength={50} value={form.name} onChange={set('name')} />
        <TextField label={tr('Adresse e-mail', 'Email address')} type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordField
          label={tr('Mot de passe', 'Password')}
          autoComplete="new-password"
          required
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint={tr(
            `Au moins ${PASSWORD_MIN_LENGTH} caractères, dont une lettre et un chiffre.`,
            `At least ${PASSWORD_MIN_LENGTH} characters, including a letter and a digit.`,
          )}
        />
        <PasswordField label={tr('Confirmer le mot de passe', 'Confirm password')} autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        {captcha.element}
        <SubmitButton pending={pending} disabled={!captcha.ready}>
          {tr('Créer mon compte', 'Create my account')}
        </SubmitButton>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {tr('En créant un compte, vous acceptez la', 'By creating an account, you accept the')}{' '}
          <Link to="/confidentialite" className="underline underline-offset-2">
            {tr('politique de confidentialité', 'privacy policy')}
          </Link>
          .
        </p>
      </form>
    </AuthCard>
  );
}
