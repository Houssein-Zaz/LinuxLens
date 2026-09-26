import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { FEEDBACK_MAX_LENGTH } from '../../lib/backend/validation';
import { buttonClass } from '../practice/Feedback';

/**
 * Petite boîte pour signaler un problème ou une explication manquante.
 * Les messages arrivent dans le tableau de bord admin, avec la commande affichée.
 */
export function FeedbackBox({ command }: { command: string }) {
  const { backend, user } = useAuth();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    const result = await backend.monitoring.sendFeedback({ message, command });
    if (result.error) {
      setError(result.error);
      setStatus('idle');
      return;
    }
    setError(undefined);
    setMessage('');
    setStatus('sent');
  };

  const box = 'rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900';

  if (status === 'sent') {
    return (
      <div role="status" className={box}>
        <p className="font-medium text-emerald-700 dark:text-emerald-300">✓ Merci ! Votre message a bien été envoyé.</p>
        {user && (
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            La réponse apparaîtra dans{' '}
            <Link to="/compte" className="font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
              Mon compte
            </Link>
            .
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setOpen(true);
          }}
          className="mt-1 text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Un problème, ou une explication manquante ou peu claire ?{' '}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
        >
          Dites-le-nous
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={box}>
      <label htmlFor={id} className="mb-1.5 block font-medium">
        Qu’est-ce qui n’allait pas ?
      </label>
      <textarea
        id={id}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={FEEDBACK_MAX_LENGTH}
        rows={4}
        autoFocus
        placeholder="Une commande mal découpée, une option non expliquée, une explication fausse…"
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint`}
        className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm outline-none transition-shadow focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 aria-[invalid=true]:border-red-300 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-indigo-500 dark:aria-[invalid=true]:border-red-500/60"
      />
      <p id={`${id}-hint`} className={`mt-1 text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
        {error ??
          (command.trim() ? (
            <>
              La commande <code className="font-mono">{command.trim()}</code> sera jointe à votre message.
            </>
          ) : (
            'Pensez à indiquer la commande concernée.'
          ))}
      </p>
      {!user && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Link to="/connexion" className="underline underline-offset-2">
            Connectez-vous
          </Link>{' '}
          avant d’envoyer si vous voulez recevoir une réponse.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" className={buttonClass.primary} disabled={status === 'sending' || !message.trim()}>
          {status === 'sending' ? 'Envoi…' : 'Envoyer'}
        </button>
        <button
          type="button"
          className={buttonClass.secondary}
          onClick={() => {
            setOpen(false);
            setError(undefined);
          }}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
