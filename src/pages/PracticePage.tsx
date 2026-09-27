import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { PermCard } from '../components/practice/PermCard';
import { QuizCard } from '../components/practice/QuizCard';
import { WriteCard } from '../components/practice/WriteCard';
import { buttonClass } from '../components/practice/Feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { CATEGORIES, CATEGORY_BY_ID } from '../data/categories';
import { ALL_EXERCISES, EXERCISE_KIND_LABEL, LEVEL_LABEL, type Exercise } from '../data/exercises';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import type { CategoryId } from '../types/command';

type KindFilter = 'all' | Exercise['kind'];

const KINDS: Array<{ id: KindFilter; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'write', label: 'Écrire la commande' },
  { id: 'quiz', label: 'Comprendre' },
  { id: 'perm', label: 'Permissions' },
];

const filterExercises = (kind: KindFilter, category: CategoryId | 'all') =>
  ALL_EXERCISES.filter((e) => (kind === 'all' || e.kind === kind) && (category === 'all' || e.category === category)).sort(
    (a, b) => a.level - b.level,
  );

/** Exercice en cours et filtres, pour reprendre au même endroit en revenant sur la page. */
interface Position {
  kind: KindFilter;
  category: CategoryId | 'all';
  hideSolved: boolean;
  exerciseId: string | null;
}

const POSITION_KEY = 'linuxlens-practice-position';

function loadPosition(): Position {
  const fallback: Position = { kind: 'all', category: 'all', hideSolved: false, exerciseId: null };
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) ?? 'null') as Partial<Position> | null;
    if (!saved) return fallback;
    return {
      kind: KINDS.some((k) => k.id === saved.kind) ? saved.kind! : 'all',
      category: saved.category && (saved.category === 'all' || saved.category in CATEGORY_BY_ID) ? saved.category : 'all',
      hideSolved: saved.hideSolved === true,
      exerciseId: typeof saved.exerciseId === 'string' ? saved.exerciseId : null,
    };
  } catch {
    return fallback;
  }
}

const NEXT = `?next=${encodeURIComponent('/exercices')}`;

/** Nombre d'exercices qu'un visiteur peut faire avant qu'on lui demande de créer un compte. */
export const GUEST_FREE_EXERCISES = 3;
const GUEST_TRIED_KEY = 'linuxlens-guest-tried';

function loadTried(): Set<string> {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(GUEST_TRIED_KEY) ?? '[]');
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveTried(ids: Set<string>) {
  try {
    localStorage.setItem(GUEST_TRIED_KEY, JSON.stringify([...ids]));
  } catch {
    // stockage indisponible : le compte repart de zéro au prochain chargement
  }
}

/**
 * Sans compte, on peut faire quelques exercices ; au-delà, une fenêtre invite à créer un compte,
 * où la progression et les résultats sont enregistrés.
 */
export function PracticePage() {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-zinc-500">Chargement…</p>;
  return <Practice guest={!user} />;
}

function SignUpPopup() {
  const id = useId();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);

  // « Plus tard » : retour à la page précédente, ou à l'accueil si on est arrivé directement ici
  const later = () => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate('/'));

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('a, button')?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      later();
    } else if (e.key === 'Tab') {
      // Le focus reste dans la fenêtre
      const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>('a, button') ?? [])];
      const at = items.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
          Créez un compte pour continuer
        </h2>
        <p id={`${id}-message`} className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Vous avez fait vos {GUEST_FREE_EXERCISES} exercices d’essai. Le compte est gratuit : les exercices déjà réussis
          y sont repris, vous retrouvez votre progression sur n’importe quel appareil, et « Mon compte » vous montre ce
          qu’il reste à revoir.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to={`/inscription${NEXT}`} className={buttonClass.primary}>
            Créer un compte
          </Link>
          <Link to={`/connexion${NEXT}`} className={buttonClass.secondary}>
            J’ai déjà un compte
          </Link>
          <button type="button" onClick={later} className="ml-auto text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

function Practice({ guest }: { guest: boolean }) {
  const { solved, recordAttempt, reset, ready } = useProgress();
  const [tried, setTried] = useState(loadTried);
  const [saved] = useState(loadPosition);
  const [kind, setKind] = useState<KindFilter>(saved.kind);
  const [category, setCategory] = useState<CategoryId | 'all'>(saved.category);
  const [hideSolved, setHideSolved] = useState(saved.hideSolved);
  const [index, setIndex] = useState(0);
  // Exercices auxquels on a répondu pendant cette visite (bonne ou mauvaise réponse)
  const [answered, setAnswered] = useState<Set<string>>(() => new Set());

  const list = useMemo(() => filterExercises(kind, category), [kind, category]);
  // « Masquer les réussis » ne retire pas l'exercice en cours, pour pouvoir lire la correction
  const [current, setCurrent] = useState<string | null>(saved.exerciseId);
  const visible = hideSolved ? list.filter((e) => !solved.has(e.id) || e.id === current) : list;
  // L'exercice en cours est retrouvé par son identifiant (retour sur la page, liste filtrée) ; sinon par sa position
  const currentIndex = current ? visible.findIndex((e) => e.id === current) : -1;
  const safeIndex = currentIndex >= 0 ? currentIndex : Math.min(index, Math.max(0, visible.length - 1));
  const exercise = visible[safeIndex];

  const exerciseId = exercise?.id ?? null;
  useEffect(() => {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ kind, category, hideSolved, exerciseId } satisfies Position));
    } catch {
      // stockage indisponible : on repartira du début
    }
  }, [kind, category, hideSolved, exerciseId]);

  const solvedInList = list.filter((e) => solved.has(e.id)).length;
  const go = (i: number) => {
    const next = (i + visible.length) % visible.length;
    setIndex(next);
    setCurrent(visible[next]?.id ?? null);
  };
  const answer = (ex: Exercise) => (correct: boolean, given: string, usedHelp: boolean) => {
    if (correct) setCurrent(ex.id);
    setAnswered((prev) => (prev.has(ex.id) ? prev : new Set(prev).add(ex.id)));
    if (guest && given.trim() && !tried.has(ex.id)) {
      const next = new Set(tried).add(ex.id);
      setTried(next);
      saveTried(next);
    }
    recordAttempt({ exerciseId: ex.id, kind: ex.kind, correct, answer: given, usedHelp });
  };
  const changeFilter = (fn: () => void) => {
    fn();
    setIndex(0);
    setCurrent(null);
  };

  // Essais épuisés : les exercices déjà faits restent consultables, un nouveau demande un compte
  // On ne passe à la suite qu'après avoir répondu à l'exercice en cours (ou s'il est déjà réussi)
  const canAdvance = exercise !== undefined && (answered.has(exercise.id) || solved.has(exercise.id) || tried.has(exercise.id));
  const locked = guest && tried.size >= GUEST_FREE_EXERCISES && exercise !== undefined && !tried.has(exercise.id);

  if (!ready) return <p className="text-zinc-500">Chargement…</p>;

  return (
    <>
      {/* Derrière la fenêtre, la page reste visible, floue et inerte */}
      <div inert={locked} aria-hidden={locked || undefined} className={locked ? 'pointer-events-none blur-sm select-none' : undefined}>
        <PageHeader title="S’exercer">
          Entraînez-vous à écrire des commandes, à les comprendre et à convertir des permissions. La correction accepte
          toutes les écritures équivalentes (<code className="font-mono text-sm">ls -la</code> ={' '}
          <code className="font-mono text-sm">ls -al</code>).
        </PageHeader>

        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-4">
          <div role="tablist" aria-label="Type d’exercice" className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="tab"
                aria-selected={kind === k.id}
                onClick={() => changeFilter(() => setKind(k.id))}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  kind === k.id
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Catégorie</span>
            <select
              value={category}
              onChange={(e) => changeFilter(() => setCategory(e.target.value as CategoryId | 'all'))}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="all">Toutes</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input type="checkbox" checked={hideSolved} onChange={(e) => changeFilter(() => setHideSolved(e.target.checked))} className="accent-indigo-600" />
            Masquer les réussis
          </label>
        </div>

        <div className="mb-6">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span>
              <strong className="font-semibold">{solvedInList}</strong>
              <span className="text-zinc-500 dark:text-zinc-400"> / {list.length} réussis</span>
            </span>
            {solved.size > 0 && (
              <button type="button" onClick={reset} className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
                Réinitialiser la progression
              </button>
            )}
          </div>
          <div
            role="progressbar"
            aria-label="Progression"
            aria-valuemin={0}
            aria-valuemax={list.length}
            aria-valuenow={solvedInList}
            className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          >
            <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-300" style={{ width: `${list.length ? (solvedInList / list.length) * 100 : 0}%` }} />
          </div>
        </div>

        {exercise ? (
          <section aria-label="Exercice" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">{EXERCISE_KIND_LABEL[exercise.kind]}</span>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{CATEGORY_BY_ID[exercise.category].label}</span>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{LEVEL_LABEL[exercise.level]}</span>
              {solved.has(exercise.id) && (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">✓ Réussi</span>
              )}
              <span className="ml-auto text-zinc-500 dark:text-zinc-400">
                {safeIndex + 1} / {visible.length}
              </span>
            </div>

            {exercise.kind === 'write' && <WriteCard key={exercise.id} exercise={exercise} onAnswer={answer(exercise)} />}
            {exercise.kind === 'quiz' && <QuizCard key={exercise.id} exercise={exercise} onAnswer={answer(exercise)} />}
            {exercise.kind === 'perm' && <PermCard key={exercise.id} exercise={exercise} onAnswer={answer(exercise)} />}

            <div className="mt-8 flex flex-wrap justify-between gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <button type="button" className={buttonClass.secondary} onClick={() => go(safeIndex - 1)} disabled={visible.length < 2}>
                ← Précédent
              </button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!canAdvance && visible.length > 1 && (
                  <span id="practice-next-hint" className="text-sm text-zinc-500 dark:text-zinc-400">
                    Répondez pour passer à la suite
                  </span>
                )}
                <button
                  type="button"
                  className={buttonClass.secondary}
                  disabled={visible.length < 2 || !canAdvance}
                  aria-describedby={canAdvance ? undefined : 'practice-next-hint'}
                  onClick={() => {
                    let next = safeIndex;
                    while (next === safeIndex) next = Math.floor(Math.random() * visible.length);
                    go(next);
                  }}
                >
                  Au hasard
                </button>
                <button type="button" className={buttonClass.primary} onClick={() => go(safeIndex + 1)}
                  disabled={visible.length < 2 || !canAdvance}
                  aria-describedby={canAdvance ? undefined : 'practice-next-hint'}
                >
                  Suivant →
                </button>
              </div>
            </div>
          </section>
        ) : (
          <p className="rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            {list.length ? 'Tous les exercices de cette sélection sont réussis. Bravo !' : 'Aucun exercice pour cette sélection.'}
          </p>
        )}
      </div>
      {locked && <SignUpPopup />}
    </>
  );
}
