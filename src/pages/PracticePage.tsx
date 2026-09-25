import { useMemo, useState } from 'react';
import { PermCard } from '../components/practice/PermCard';
import { QuizCard } from '../components/practice/QuizCard';
import { WriteCard } from '../components/practice/WriteCard';
import { buttonClass } from '../components/practice/Feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { CATEGORIES, CATEGORY_BY_ID } from '../data/categories';
import { ALL_EXERCISES, LEVEL_LABEL, type Exercise } from '../data/exercises';
import { useProgress } from '../hooks/useProgress';
import type { CategoryId } from '../types/command';

type KindFilter = 'all' | Exercise['kind'];

const KINDS: Array<{ id: KindFilter; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'write', label: 'Écrire la commande' },
  { id: 'quiz', label: 'Comprendre' },
  { id: 'perm', label: 'Permissions' },
];

const KIND_LABEL: Record<Exercise['kind'], string> = { write: 'Écrire la commande', quiz: 'Comprendre', perm: 'Conversion' };

export function PracticePage() {
  const { solved, markSolved, reset } = useProgress();
  const [kind, setKind] = useState<KindFilter>('all');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [hideSolved, setHideSolved] = useState(false);
  const [index, setIndex] = useState(0);

  const list = useMemo(
    () =>
      ALL_EXERCISES.filter(
        (e) => (kind === 'all' || e.kind === kind) && (category === 'all' || e.category === category),
      ).sort((a, b) => a.level - b.level),
    [kind, category],
  );
  // « Masquer les réussis » ne retire pas l'exercice en cours, pour pouvoir lire la correction
  const [current, setCurrent] = useState<string | null>(null);
  const visible = hideSolved ? list.filter((e) => !solved.has(e.id) || e.id === current) : list;
  const safeIndex = Math.min(index, Math.max(0, visible.length - 1));
  const exercise = visible[safeIndex];

  const solvedInList = list.filter((e) => solved.has(e.id)).length;
  const go = (i: number) => {
    const next = (i + visible.length) % visible.length;
    setIndex(next);
    setCurrent(visible[next]?.id ?? null);
  };
  const solve = (id: string) => {
    setCurrent(id);
    markSolved(id);
  };
  const changeFilter = (fn: () => void) => {
    fn();
    setIndex(0);
    setCurrent(null);
  };

  return (
    <>
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
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">{KIND_LABEL[exercise.kind]}</span>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{CATEGORY_BY_ID[exercise.category].label}</span>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{LEVEL_LABEL[exercise.level]}</span>
            {solved.has(exercise.id) && (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">✓ Réussi</span>
            )}
            <span className="ml-auto text-zinc-500 dark:text-zinc-400">
              {safeIndex + 1} / {visible.length}
            </span>
          </div>

          {exercise.kind === 'write' && <WriteCard key={exercise.id} exercise={exercise} onSolved={() => solve(exercise.id)} />}
          {exercise.kind === 'quiz' && <QuizCard key={exercise.id} exercise={exercise} onSolved={() => solve(exercise.id)} />}
          {exercise.kind === 'perm' && <PermCard key={exercise.id} exercise={exercise} onSolved={() => solve(exercise.id)} />}

          <div className="mt-8 flex flex-wrap justify-between gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <button type="button" className={buttonClass.secondary} onClick={() => go(safeIndex - 1)} disabled={visible.length < 2}>
              ← Précédent
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonClass.secondary}
                disabled={visible.length < 2}
                onClick={() => {
                  let next = safeIndex;
                  while (next === safeIndex) next = Math.floor(Math.random() * visible.length);
                  go(next);
                }}
              >
                Au hasard
              </button>
              <button type="button" className={buttonClass.primary} onClick={() => go(safeIndex + 1)} disabled={visible.length < 2}>
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
    </>
  );
}
