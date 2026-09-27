import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { useCaptcha } from '../../components/auth/Captcha';
import { FormError, FormSuccess, SubmitButton, TextField } from '../../components/auth/FormFields';
import { useAuth } from '../../hooks/useAuth';
import { useTr } from '../../i18n';

export function ForgotPasswordPage() {
  const { backend } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const captcha = useCaptcha();
  const tr = useTr();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await backend.auth.requestPasswordReset(email, captcha.token);
    setPending(false);
    if (result.error) {
      setError(result.error);
      captcha.reset();
    }
    else setSent(true);
  };

  return (
    <AuthCard
      title={tr('Mot de passe oublié', 'Forgot password')}
      subtitle={tr(
        'Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe.',
        'Enter your address: you will receive a link to choose a new password.',
      )}
      footer={
        <Link to="/connexion" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          ← {tr('Retour à la connexion', 'Back to sign in')}
        </Link>
      }
    >
      {sent ? (
        // Même message que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites
        <FormSuccess>
          {tr(
            'Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé.',
            'If an account exists for this address, a reset email has just been sent.',
          )}
        </FormSuccess>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError>{error}</FormError>
          <TextField label={tr('Adresse e-mail', 'Email address')} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {captcha.element}
          <SubmitButton pending={pending} disabled={!captcha.ready}>
            {tr('Envoyer le lien', 'Send the link')}
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
