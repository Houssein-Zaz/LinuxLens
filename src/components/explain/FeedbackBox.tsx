import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { FEEDBACK_MAX_LENGTH } from '../../lib/backend/validation';
import type { FeedbackInput } from '../../types/backend';
import { buttonClass } from '../practice/Feedback';

type Field = 'liked' | 'disliked' | 'message';

const FIELDS: Array<{ name: Field; label: string; placeholder: string; rows: number }> = [
  { name: 'liked', label: 'Ce que vous avez aimé', placeholder: 'Les explications option par option, les exercices…', rows: 2 },
  { name: 'disliked', label: 'Ce qui ne vous a pas plu', placeholder: 'Une commande mal découpée, une explication fausse ou peu claire…', rows: 2 },
  { name: 'message', label: 'Commentaire', placeholder: 'Une suggestion, une commande qui manque…', rows: 3 },
];

const EMPTY: Record<Field, string> = { liked: '', disliked: '', message: '' };

/**
 * Formulaire d'avis : ce qui a plu, ce qui n'a pas plu, et un commentaire libre.
 * Les avis arrivent dans le tableau de bord admin, avec la commande affichée.
 */
export function FeedbackBox({ command }: { command: string }) {
  const { backend, user } = useAuth();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string>();
  const empty = !form.liked.trim() && !form.disliked.trim() && !form.message.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    const input: FeedbackInput = { ...form, command };
    const result = await backend.monitoring.sendFeedback(input);
    if (result.error) {
      setError(result.error);
      setStatus('idle');
      return;
    }
    setError(undefined);
    setForm(EMPTY);
    setStatus('sent');
  };

  const box = 'rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900';

  if (status === 'sent') {
    return (
      <div role="status" className={box}>
        <p className="font-medium text-emerald-700 dark:text-emerald-300">✓ Merci ! Votre avis a bien été envoyé.</p>
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
          Donner un autre avis
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Un avis, un problème, ou une explication manquante ?{' '}
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
      <fieldset>
        <legend className="mb-3 font-medium">Votre avis</legend>
        <div className="space-y-3">
          {FIELDS.map((f, i) => (
            <div key={f.name}>
              <label htmlFor={`${id}-${f.name}`} className="mb-1.5 block font-medium">
                {f.label} <span className="font-normal text-zinc-500 dark:text-zinc-400">(facultatif)</span>
              </label>
              <textarea
                id={`${id}-${f.name}`}
                value={form[f.name]}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                maxLength={FEEDBACK_MAX_LENGTH}
                rows={f.rows}
                autoFocus={i === 0}
                placeholder={f.placeholder}
                aria-invalid={Boolean(error)}
                className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm outline-none transition-shadow focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 aria-[invalid=true]:border-red-300 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-indigo-500 dark:aria-[invalid=true]:border-red-500/60"
              />
            </div>
          ))}
        </div>
      </fieldset>
      <p role={error ? 'alert' : undefined} className={`mt-2 text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
        {error ??
          (command.trim() ? (
            <>
              La commande <code className="font-mono">{command.trim()}</code> sera jointe à votre avis.
            </>
          ) : (
            'Remplissez au moins un champ.'
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
        <button type="submit" className={buttonClass.primary} disabled={status === 'sending' || empty}>
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
