import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { DemoBanner } from '../../components/auth/DemoBanner';
import { FormError, FormSuccess, PasswordField, TextField } from '../../components/auth/FormFields';
import { buttonClass } from '../../components/practice/Feedback';
import { PageHeader } from '../../components/ui/PageHeader';
import { ALL_EXERCISES, EXERCISE_BY_ID, EXERCISE_KIND_LABEL, exerciseTitle } from '../../data/exercises';
import { useAuth } from '../../hooks/useAuth';
import { useFavorites } from '../../hooks/useFavorites';
import { useProgress } from '../../hooks/useProgress';
import { PASSWORD_MIN_LENGTH } from '../../lib/backend/validation';
import { computeStats } from '../../lib/stats';
import type { Attempt, ExerciseKind, HistoryEntry } from '../../types/backend';

const DELETE_WORD = 'SUPPRIMER';

function Card({ title, id, children, tone = 'default' }: { title: string; id: string; children: ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <section
      aria-labelledby={id}
      className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 dark:bg-zinc-900 ${
        tone === 'danger' ? 'border-red-200 dark:border-red-400/30' : 'border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <h2 id={id} className="mb-4 text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export function AccountPage() {
  const { backend, user } = useAuth();
  const navigate = useNavigate();
  const { solved } = useProgress();
  const { favorites, toggle } = useFavorites();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    backend.admin
      ?.isAdmin()
      .then((ok) => alive && setIsAdmin(ok))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [backend]);

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

  const signOut = async () => {
    await backend.auth.signOut();
    navigate('/');
  };

  return (
    <>
      <PageHeader title="Mon compte">
        Connecté en tant que <strong className="font-medium text-zinc-900 dark:text-zinc-100">{user.email}</strong>
      </PageHeader>
      <DemoBanner className="mb-6" />
      {isAdmin && (
        <Link
          to="/admin"
          className="mb-6 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800 hover:bg-indigo-100 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200 dark:hover:bg-indigo-400/20"
        >
          Tableau de bord administrateur
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Progression" id="progression">
          <p className="text-3xl font-semibold tracking-tight">
            {solved.size} <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">/ {ALL_EXERCISES.length} exercices réussis</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(solved.size / ALL_EXERCISES.length) * 100}%` }} />
          </div>
          <Link to="/exercices" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Continuer les exercices →
          </Link>
        </Card>

        <ResultsCard />

        <Card title="Favoris" id="favoris">
          {favorites.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Aucun favori pour l’instant. Ajoutez-en avec le bouton ☆ d’une{' '}
              <Link to="/explorer" className="underline underline-offset-2">
                fiche de commande
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
                    onClick={() => toggle(c)}
                    aria-label={`Retirer ${c} des favoris`}
                    className="px-2 py-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Historique" id="historique">
          {history.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Les commandes que vous expliquez apparaîtront ici.</p>
          ) : (
            <>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
              <button
                type="button"
                onClick={async () => {
                  await backend.data.clearHistory();
                  setHistory([]);
                }}
                className="mt-3 text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
              >
                Effacer l’historique
              </button>
            </>
          )}
        </Card>

        <ProfileCard />
        <PasswordCard />

        <Card title="Session et compte" id="danger" tone="danger">
          <button type="button" onClick={signOut} className={buttonClass.secondary}>
            Se déconnecter
          </button>
          <DeleteAccount />
        </Card>
      </div>
    </>
  );
}

const percent = (x: number) => `${Math.round(x * 100)} %`;
const KINDS: ExerciseKind[] = ['write', 'quiz', 'perm'];

function ResultsCard() {
  const { backend } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);

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

  if (!attempts) {
    return (
      <Card title="Mes résultats" id="resultats">
        <p className="text-sm text-zinc-500">Chargement…</p>
      </Card>
    );
  }
  if (attempts.length === 0) {
    return (
      <Card title="Mes résultats" id="resultats">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Vos réponses aux{' '}
          <Link to="/exercices" className="underline underline-offset-2">
            exercices
          </Link>{' '}
          apparaîtront ici : taux de réussite, exercices réussis du premier coup, points à revoir.
        </p>
      </Card>
    );
  }

  const s = computeStats(attempts);
  const tiles = [
    { label: 'Taux de réussite', value: percent(s.successRate), detail: `${s.correct} bonne${s.correct > 1 ? 's' : ''} réponse${s.correct > 1 ? 's' : ''} sur ${s.attempts}` },
    { label: 'Du premier coup', value: String(s.firstTry), detail: 'sans erreur ni aide' },
    { label: 'Essais', value: String(s.attempts), detail: `sur ${s.exercises} exercice${s.exercises > 1 ? 's' : ''}` },
  ];

  return (
    <Card title="Mes résultats" id="resultats">
      <dl className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{t.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">{t.value}</dd>
            <dd className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t.detail}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-5 mb-2 text-sm font-medium">Par type d’exercice</h3>
      <ul className="space-y-2">
        {KINDS.filter((k) => s.byKind[k].attempts > 0).map((k) => {
          const kind = s.byKind[k];
          const rate = kind.correct / kind.attempts;
          return (
            <li key={k} className="text-sm">
              <div className="flex justify-between">
                <span>{EXERCISE_KIND_LABEL[k]}</span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {percent(rate)} · {kind.solved} réussi{kind.solved > 1 ? 's' : ''}
                </span>
              </div>
              <div
                role="meter"
                aria-label={`Réussite : ${EXERCISE_KIND_LABEL[k]}`}
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

      {s.toReview.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-sm font-medium">À revoir</h3>
          <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {s.toReview.map((r) => {
              const ex = EXERCISE_BY_ID.get(r.exerciseId);
              return (
                <li key={r.exerciseId} className="flex items-baseline justify-between gap-4 py-2">
                  <span className="min-w-0 truncate">{ex ? exerciseTitle(ex) : r.exerciseId}</span>
                  <span className={`shrink-0 text-xs ${r.solved ? 'text-zinc-500 dark:text-zinc-400' : 'text-amber-700 dark:text-amber-300'}`}>
                    {r.errors} erreur{r.errors > 1 ? 's' : ''}
                    {r.solved ? ' · réussi' : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

function ProfileCard() {
  const { backend, user } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await backend.auth.updateProfile(name);
    setMessage(r.error ? { ok: false, text: r.error } : { ok: true, text: 'Profil enregistré.' });
  };

  return (
    <Card title="Profil" id="profil">
      <form onSubmit={submit} className="space-y-3">
        <TextField label="Nom affiché" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
        {message && (message.ok ? <FormSuccess>{message.text}</FormSuccess> : <FormError>{message.text}</FormError>)}
        <button type="submit" className={buttonClass.primary}>
          Enregistrer
        </button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const { backend } = useAuth();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await backend.auth.updatePassword(password);
    setMessage(r.error ? { ok: false, text: r.error } : { ok: true, text: 'Mot de passe modifié.' });
    if (!r.error) setPassword('');
  };

  return (
    <Card title="Mot de passe" id="mot-de-passe">
      <form onSubmit={submit} className="space-y-3">
        <PasswordField
          label="Nouveau mot de passe"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères, dont une lettre et un chiffre.`}
        />
        {message && (message.ok ? <FormSuccess>{message.text}</FormSuccess> : <FormError>{message.text}</FormError>)}
        <button type="submit" className={buttonClass.primary} disabled={!password}>
          Changer le mot de passe
        </button>
      </form>
    </Card>
  );
}

function DeleteAccount() {
  const { backend } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string>();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 block text-sm font-medium text-red-600 hover:underline dark:text-red-400">
        Supprimer mon compte…
      </button>
    );
  }

  return (
    <form
      className="mt-5 space-y-3 rounded-xl bg-red-50 p-4 dark:bg-red-400/10"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await backend.auth.deleteAccount();
        if (r.error) setError(r.error);
        else navigate('/', { replace: true });
      }}
    >
      <p className="text-sm text-red-900 dark:text-red-200">
        Votre compte, votre progression, vos résultats, vos favoris et votre historique seront <strong>définitivement supprimés</strong>.
        Tapez <strong className="font-mono">{DELETE_WORD}</strong> pour confirmer.
      </p>
      <TextField label="Confirmation" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      <FormError>{error}</FormError>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={typed !== DELETE_WORD}
          className="inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Supprimer définitivement
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass.secondary}>
          Annuler
        </button>
      </div>
    </form>
  );
}
