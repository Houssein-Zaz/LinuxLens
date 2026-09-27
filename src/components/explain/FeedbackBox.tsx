import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { FEEDBACK_MAX_LENGTH } from '../../lib/backend/validation';
import type { FeedbackInput } from '../../types/backend';
import { buttonClass } from '../practice/Feedback';
import { useTr } from '../../i18n';

type Field = 'liked' | 'disliked' | 'message';

const fields = (tr: (fr: string, en: string) => string): Array<{ name: Field; label: string; placeholder: string; rows: number }> => [
  {
    name: 'liked',
    label: tr('Ce que vous avez aimé', 'What you liked'),
    placeholder: tr('Les explications option par option, les exercices…', 'The option-by-option explanations, the exercises…'),
    rows: 2,
  },
  {
    name: 'disliked',
    label: tr('Ce qui ne vous a pas plu', 'What you did not like'),
    placeholder: tr('Une commande mal découpée, une explication fausse ou peu claire…', 'A command broken down wrongly, a wrong or unclear explanation…'),
    rows: 2,
  },
  {
    name: 'message',
    label: tr('Commentaire', 'Comment'),
    placeholder: tr('Une suggestion, une commande qui manque…', 'A suggestion, a missing command…'),
    rows: 3,
  },
];

const EMPTY: Record<Field, string> = { liked: '', disliked: '', message: '' };

/**
 * Formulaire d'avis : ce qui a plu, ce qui n'a pas plu, et un commentaire libre.
 * Les avis arrivent dans le tableau de bord admin, avec la commande affichée.
 */
export function FeedbackBox({ command }: { command: string }) {
  const { backend, user } = useAuth();
  const id = useId();
  const tr = useTr();
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
        <p className="font-medium text-emerald-700 dark:text-emerald-300">✓ {tr('Merci ! Votre avis a bien été envoyé.', 'Thank you! Your feedback has been sent.')}</p>
        {user && (
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {tr('La réponse apparaîtra dans', 'The reply will appear in')}{' '}
            <Link to="/compte" className="font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
              {tr('Mon compte', 'My account')}
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
          {tr('Donner un autre avis', 'Give more feedback')}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        {tr('Un avis, un problème, ou une explication manquante ?', 'Feedback, a problem, or a missing explanation?')}{' '}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
        >
          {tr('Dites-le-nous', 'Tell us')}
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={box}>
      <fieldset>
        <legend className="mb-3 font-medium">{tr('Votre avis', 'Your feedback')}</legend>
        <div className="space-y-3">
          {fields(tr).map((f, i) => (
            <div key={f.name}>
              <label htmlFor={`${id}-${f.name}`} className="mb-1.5 block font-medium">
                {f.label} <span className="font-normal text-zinc-500 dark:text-zinc-400">({tr('facultatif', 'optional')})</span>
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
              {tr('La commande', 'The command')} <code className="font-mono">{command.trim()}</code>{' '}
              {tr('sera jointe à votre avis.', 'will be attached to your feedback.')}
            </>
          ) : (
            tr('Remplissez au moins un champ.', 'Fill in at least one field.')
          ))}
      </p>
      {!user && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Link to="/connexion" className="underline underline-offset-2">
            {tr('Connectez-vous', 'Sign in')}
          </Link>{' '}
          {tr('avant d’envoyer si vous voulez recevoir une réponse.', 'before sending if you would like a reply.')}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" className={buttonClass.primary} disabled={status === 'sending' || empty}>
          {status === 'sending' ? tr('Envoi…', 'Sending…') : tr('Envoyer', 'Send')}
        </button>
        <button
          type="button"
          className={buttonClass.secondary}
          onClick={() => {
            setOpen(false);
            setError(undefined);
          }}
        >
          {tr('Annuler', 'Cancel')}
        </button>
      </div>
    </form>
  );
}
