import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthCard } from '../../components/auth/AuthCard';
import { FormError, FormSuccess, SubmitButton, TextField } from '../../components/auth/FormFields';
import { useAuth } from '../../hooks/useAuth';

export function ForgotPasswordPage() {
  const { backend } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await backend.auth.requestPasswordReset(email);
    setPending(false);
    if (result.error) setError(result.error);
    else setSent(true);
  };

  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle="Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe."
      footer={
        <Link to="/connexion" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          ← Retour à la connexion
        </Link>
      }
    >
      {sent ? (
        // Même message que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites
        <FormSuccess>Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé.</FormSuccess>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError>{error}</FormError>
          <TextField label="Adresse e-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <SubmitButton pending={pending}>Envoyer le lien</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
