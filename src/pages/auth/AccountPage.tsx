import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { DemoBanner } from '../../components/auth/DemoBanner';
import { FormError, FormSuccess, TextField } from '../../components/auth/FormFields';
import { FeedbackSections } from '../../components/explain/FeedbackSections';
import { buttonClass } from '../../components/practice/Feedback';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { ALL_EXERCISES, EXERCISE_BY_ID, EXERCISE_KIND_LABEL, exerciseTitle } from '../../data/exercises';
import { useAuth } from '../../hooks/useAuth';
import { useFavorites } from '../../hooks/useFavorites';
import { useProgress } from '../../hooks/useProgress';
import { computeStats } from '../../lib/stats';
import type { Attempt, ExerciseKind, HistoryEntry, MyFeedback } from '../../types/backend';
import { getLang, useTr } from '../../i18n';

/** `wide` : toute la largeur ; `action` : lien ou bouton à droite du titre. */
function Card({ title, id, children, wide, action }: { title: string; id: string; children: ReactNode; wide?: boolean; action?: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900 ${wide ? 'lg:col-span-2' : ''}`}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const formats = {
  fr: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }),
  en: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),
};
const dateFormat = { format: (d: Date) => formats[getLang()].format(d) };

export function AccountPage() {
  const { backend, user } = useAuth();
  const { favorites, toggle } = useFavorites();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [confirm, confirmDialog] = useConfirm();
  const tr = useTr();

  useEffect(() => {
    let alive = true;
    backend.data
      .getHistory(20)
      .then((h) => alive && setHistory(h))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [backend]);

  if (!user) return null; // protégé par <RequireAuth>

  return (
    <>
      <PageHeader title={tr('Mon compte', 'My account')} />
      <DemoBanner className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileCard />
        <ResultsCard />

        <Card title={tr('Favoris', 'Favorites')} id="favoris">
          {favorites.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {tr('Aucun favori pour l’instant. Ajoutez-en avec le bouton ☆ d’une', 'No favorites yet. Add some with the ☆ button on a')}{' '}
              <Link to="/explorer" className="underline underline-offset-2">
                {tr('fiche de commande', 'command page')}
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {favorites.map((c) => (
                <li key={c} className="flex items-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <Link to={`/commande/${encodeURIComponent(c)}`} className="px-2.5 py-1 font-mono text-sm hover:text-indigo-700 dark:hover:text-indigo-300">
                    {c}
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: tr('Retirer ce favori ?', 'Remove this favorite?'),
                        message: (
                          <>
                            {tr('La commande', 'The command')} <code className="font-mono">{c}</code>{' '}
                            {tr('ne sera plus dans vos favoris.', 'will no longer be in your favorites.')}
                          </>
                        ),
                        confirmLabel: tr('Retirer', 'Remove'),
                        danger: true,
                      });
                      if (ok) toggle(c);
                    }}
                    aria-label={tr(`Retirer ${c} des favoris`, `Remove ${c} from favorites`)}
                    className="px-2 py-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={tr('Historique', 'History')}
          id="historique"
          action={
            history.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: tr('Effacer l’historique ?', 'Clear the history?'),
                    message: tr(
                      `Les ${history.length} commande${history.length > 1 ? 's' : ''} de votre historique seront effacée${history.length > 1 ? 's' : ''} définitivement.`,
                      `The ${history.length} command${history.length > 1 ? 's' : ''} in your history will be permanently erased.`,
                    ),
                    confirmLabel: tr('Effacer', 'Clear'),
                    danger: true,
                  });
                  if (!ok) return;
                  await backend.data.clearHistory();
                  setHistory([]);
                }}
                className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
              >
                {tr('Effacer l’historique', 'Clear the history')}
              </button>
            )
          }
        >
          {history.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{tr('Les commandes que vous expliquez apparaîtront ici.', 'The commands you explain will appear here.')}</p>
          ) : (
            <ul className="-my-2 max-h-80 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
              {history.map((h) => (
                <li key={h.command} className="flex items-baseline justify-between gap-4 py-2">
                  <Link to={`/?c=${encodeURIComponent(h.command)}`} className="min-w-0 truncate font-mono text-sm hover:text-indigo-700 dark:hover:text-indigo-300">
                    {h.command}
                  </Link>
                  <time dateTime={h.createdAt} className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    {dateFormat.format(new Date(h.createdAt))}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <MessagesCard />
      </div>
      {confirmDialog}
    </>
  );
}

const percent = (x: number) => `${Math.round(x * 100)} %`;
const KINDS: ExerciseKind[] = ['write', 'quiz', 'perm'];

function ResultsCard() {
  const { backend } = useAuth();
  const { solved } = useProgress();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const tr = useTr();

  useEffect(() => {
    let alive = true;
    backend.data
      .getAttempts()
      .then((a) => alive && setAttempts(a))
      .catch(() => alive && setAttempts([]));
    return () => {
      alive = false;
    };
  }, [backend]);

  // Progression en tête de carte, puis le détail des réponses quand il y en a
  const card = (details: ReactNode) => (
    <Card
      title={tr('Ma progression', 'My progress')}
      id="progression"
      wide
      action={
        <Link to="/exercices" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          {tr('Continuer les exercices →', 'Continue the exercises →')}
        </Link>
      }
    >
      <p className="text-3xl font-semibold tracking-tight">
        {solved.size} <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">
          / {ALL_EXERCISES.length} {tr('exercices réussis', 'exercises solved')}
        </span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(solved.size / ALL_EXERCISES.length) * 100}%` }} />
      </div>
      {details}
    </Card>
  );

  if (!attempts) return card(<p className="mt-5 text-sm text-zinc-500">{tr('Chargement…', 'Loading…')}</p>);
  if (attempts.length === 0) {
    return card(
      <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
        {tr(
          'Vos réponses aux exercices apparaîtront ici : taux de réussite, exercices réussis du premier coup, points à revoir.',
          'Your answers to the exercises will appear here: success rate, exercises solved on the first try, things to review.',
        )}
      </p>,
    );
  }

  const s = computeStats(attempts);
  const tiles = [
    {
      label: tr('Taux de réussite', 'Success rate'),
      value: percent(s.successRate),
      detail: tr(
        `${s.correct} bonne${s.correct > 1 ? 's' : ''} réponse${s.correct > 1 ? 's' : ''} sur ${s.attempts}`,
        `${s.correct} correct answer${s.correct > 1 ? 's' : ''} out of ${s.attempts}`,
      ),
    },
    { label: tr('Du premier coup', 'First try'), value: String(s.firstTry), detail: tr('sans erreur ni aide', 'with no mistake or help') },
    {
      label: tr('Essais', 'Attempts'),
      value: String(s.attempts),
      detail: tr(`sur ${s.exercises} exercice${s.exercises > 1 ? 's' : ''}`, `on ${s.exercises} exercise${s.exercises > 1 ? 's' : ''}`),
    },
  ];

  return card(
    <>
      <dl className="mt-6 grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{t.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">{t.value}</dd>
            <dd className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t.detail}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">{tr('Par type d’exercice', 'By exercise type')}</h3>
          <ul className="space-y-2">
            {KINDS.filter((k) => s.byKind[k].attempts > 0).map((k) => {
              const kind = s.byKind[k];
              const rate = kind.correct / kind.attempts;
              return (
                <li key={k} className="text-sm">
                  <div className="flex justify-between">
                    <span>{EXERCISE_KIND_LABEL[k]}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {percent(rate)} · {kind.solved} {tr(`réussi${kind.solved > 1 ? 's' : ''}`, 'solved')}
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={tr(`Réussite : ${EXERCISE_KIND_LABEL[k]}`, `Success: ${EXERCISE_KIND_LABEL[k]}`)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(rate * 100)}
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                  >
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${rate * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {s.toReview.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">{tr('À revoir', 'To review')}</h3>
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {s.toReview.map((r) => {
                const ex = EXERCISE_BY_ID.get(r.exerciseId);
                return (
                  <li key={r.exerciseId} className="flex items-baseline justify-between gap-4 py-2">
                    <span className="min-w-0 truncate">{ex ? exerciseTitle(ex) : r.exerciseId}</span>
                    <span className={`shrink-0 text-xs ${r.solved ? 'text-zinc-500 dark:text-zinc-400' : 'text-amber-700 dark:text-amber-300'}`}>
                      {r.errors} {tr(`erreur${r.errors > 1 ? 's' : ''}`, `mistake${r.errors > 1 ? 's' : ''}`)}
                      {r.solved ? tr(' · réussi', ' · solved') : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </>,
  );
}

function MessagesCard() {
  const { backend } = useAuth();
  const [messages, setMessages] = useState<MyFeedback[] | null>(null);
  const tr = useTr();

  useEffect(() => {
    let alive = true;
    backend.data
      .getMyFeedback()
      .then((m) => alive && setMessages(m))
      .catch(() => alive && setMessages([]));
    return () => {
      alive = false;
    };
  }, [backend]);

  return (
    <Card title={tr('Mes messages', 'My messages')} id="messages" wide>
      {!messages ? (
        <p className="text-sm text-zinc-500">{tr('Chargement…', 'Loading…')}</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {tr('Un avis, un problème ou une explication manquante ? Utilisez « Dites-le-nous » sous l’', 'Feedback, a problem or a missing explanation? Use “Tell us” below the ')}
          <Link to="/" className="underline underline-offset-2">
            {tr('explication d’une commande', 'explanation of a command')}
          </Link>
          {tr('. Vos messages et nos réponses apparaîtront ici.', '. Your messages and our replies will appear here.')}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {messages.map((m) => (
            <li key={m.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-4">
                {m.reply ? (
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">✓ {tr('Répondu', 'Replied')}</span>
                ) : (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{tr('En attente de réponse', 'Awaiting reply')}</span>
                )}
                <time dateTime={m.createdAt} className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                  {dateFormat.format(new Date(m.createdAt))}
                </time>
              </div>
              <FeedbackSections f={m} />
              {m.command && (
                <Link
                  to={`/?c=${encodeURIComponent(m.command)}`}
                  className="mt-1 block truncate font-mono text-xs text-zinc-500 hover:text-indigo-700 dark:text-zinc-400 dark:hover:text-indigo-300"
                >
                  {m.command}
                </Link>
              )}
              {m.reply && (
                <div className="mt-2 rounded-xl border-l-4 border-indigo-400 bg-indigo-50 px-3 py-2 dark:border-indigo-500 dark:bg-indigo-400/10">
                  <p className="text-xs font-medium text-indigo-800 dark:text-indigo-200">
                    {tr('Réponse de LinuxLens', 'Reply from LinuxLens')}
                    {m.repliedAt && <span className="font-normal"> · {dateFormat.format(new Date(m.repliedAt))}</span>}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line [overflow-wrap:anywhere]">{m.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ProfileCard() {
  const { backend, user } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [confirm, confirmDialog] = useConfirm();
  const tr = useTr();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = name.trim();
    const ok = await confirm({
      title: tr('Modifier votre profil ?', 'Update your profile?'),
      message: next
        ? tr(`Votre nom affiché deviendra « ${next} ».`, `Your display name will become “${next}”.`)
        : tr('Votre nom affiché sera retiré : votre adresse e-mail sera utilisée à la place.', 'Your display name will be removed: your email address will be used instead.'),
      confirmLabel: tr('Enregistrer', 'Save'),
    });
    if (!ok) return;
    const r = await backend.auth.updateProfile(name);
    setMessage(r.error ? { ok: false, text: r.error } : { ok: true, text: tr('Profil enregistré.', 'Profile saved.') });
  };

  if (!user) return null;
  const shown = user.displayName || user.email;

  return (
    <Card title={tr('Profil', 'Profile')} id="profil" wide>
      <div className="grid gap-6 md:grid-cols-2 md:items-end">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-indigo-600 text-xl font-semibold text-white dark:bg-indigo-500">
            {shown.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            {user.displayName && <p className="truncate font-medium">{user.displayName}</p>}
            <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
              {tr('Connecté en tant que', 'Signed in as')} <strong className="font-medium text-zinc-900 dark:text-zinc-100">{user.email}</strong>
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TextField label={tr('Nom affiché', 'Display name')} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button type="submit" className={`${buttonClass.primary} h-11`}>
              {tr('Enregistrer', 'Save')}
            </button>
          </div>
          {message && (message.ok ? <FormSuccess>{message.text}</FormSuccess> : <FormError>{message.text}</FormError>)}
        </form>
      </div>
      {confirmDialog}
    </Card>
  );
}
