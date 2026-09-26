import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { useCaptcha } from '../../components/auth/Captcha';
import { FormError, PasswordField, SubmitButton, TextField } from '../../components/auth/FormFields';
import { safeNext } from '../../components/auth/RequireAuth';
import { useAuth } from '../../hooks/useAuth';

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
      title="Connexion"
      subtitle="Retrouvez votre progression, vos favoris et votre historique."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link to={`/inscription${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className={linkClass}>
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <TextField label="Adresse e-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label="Mot de passe" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="text-right text-sm">
          <Link to="/mot-de-passe-oublie" className={linkClass}>
            Mot de passe oublié ?
          </Link>
        </div>
        {captcha.element}
        <SubmitButton pending={pending} disabled={!captcha.ready}>
          Se connecter
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
