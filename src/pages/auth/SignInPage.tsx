import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { useCaptcha } from '../../components/auth/Captcha';
import { FormError, PasswordField, SubmitButton, TextField } from '../../components/auth/FormFields';
import { safeNext } from '../../components/auth/RequireAuth';
import { useAuth } from '../../hooks/useAuth';
import { useTr } from '../../i18n';

const linkClass = 'font-medium text-indigo-600 hover:underline dark:text-indigo-400';

export function SignInPage() {
  const { backend, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const captcha = useCaptcha();
  const tr = useTr();

  // Déjà connecté (ou retour du lien de confirmation par e-mail)
  if (user && !pending) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await backend.auth.signIn(email, password, captcha.token);
    setPending(false);
    if (result.error) {
      setError(result.error);
      captcha.reset();
    }
    else navigate(next, { replace: true });
  };

  return (
    <AuthCard
      title={tr('Connexion', 'Sign in')}
      subtitle={tr('Retrouvez votre progression, vos favoris et votre historique.', 'Get back your progress, favorites and history.')}
      footer={
        <>
          {tr('Pas encore de compte ?', 'No account yet?')}{' '}
          <Link to={`/inscription${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className={linkClass}>
            {tr('Créer un compte', 'Create an account')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <TextField label={tr('Adresse e-mail', 'Email address')} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label={tr('Mot de passe', 'Password')} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="text-right text-sm">
          <Link to="/mot-de-passe-oublie" className={linkClass}>
            {tr('Mot de passe oublié ?', 'Forgot your password?')}
          </Link>
        </div>
        {captcha.element}
        <SubmitButton pending={pending} disabled={!captcha.ready}>
          {tr('Se connecter', 'Sign in')}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
