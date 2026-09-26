import type { Attempt, ExerciseKind } from '../types/backend';

export interface KindStats {
  attempts: number;
  correct: number;
  /** Exercices différents réussis au moins une fois. */
  solved: number;
}

export interface ExerciseErrors {
  exerciseId: string;
  errors: number;
  solved: boolean;
}

export interface Stats {
  attempts: number;
  correct: number;
  /** Part des essais corrects, de 0 à 1 (0 sans essai). */
  successRate: number;
  /** Exercices différents tentés. */
  exercises: number;
  solved: number;
  /** Exercices dont le tout premier essai était juste, sans indice ni solution. */
  firstTry: number;
  byKind: Record<ExerciseKind, KindStats>;
  /** Exercices avec le plus d'erreurs, non réussis d'abord. */
  toReview: ExerciseErrors[];
}

/** Statistiques d'un utilisateur, calculées à partir de ses essais (dans n'importe quel ordre). */
export function computeStats(attempts: readonly Attempt[], reviewCount = 5): Stats {
  const chronological = [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const byKind: Record<ExerciseKind, KindStats> = {
    write: { attempts: 0, correct: 0, solved: 0 },
    quiz: { attempts: 0, correct: 0, solved: 0 },
    perm: { attempts: 0, correct: 0, solved: 0 },
  };
  const perExercise = new Map<string, { kind: ExerciseKind; errors: number; solved: boolean; firstTry: boolean }>();

  for (const a of chronological) {
    byKind[a.kind].attempts++;
    if (a.correct) byKind[a.kind].correct++;
    let e = perExercise.get(a.exerciseId);
    if (!e) {
      e = { kind: a.kind, errors: 0, solved: false, firstTry: a.correct && !a.usedHelp };
      perExercise.set(a.exerciseId, e);
    }
    if (a.correct) e.solved = true;
    else e.errors++;
  }

  let solved = 0;
  let firstTry = 0;
  for (const e of perExercise.values()) {
    if (e.solved) {
      solved++;
      byKind[e.kind].solved++;
    }
    if (e.firstTry) firstTry++;
  }

  const correct = attempts.filter((a) => a.correct).length;
  const toReview = [...perExercise]
    .filter(([, e]) => e.errors > 0)
    .map(([exerciseId, e]) => ({ exerciseId, errors: e.errors, solved: e.solved }))
    .sort((a, b) => Number(a.solved) - Number(b.solved) || b.errors - a.errors || a.exerciseId.localeCompare(b.exerciseId))
    .slice(0, reviewCount);

  return {
    attempts: attempts.length,
    correct,
    successRate: attempts.length ? correct / attempts.length : 0,
    exercises: perExercise.size,
    solved,
    firstTry,
    byKind,
    toReview,
  };
}
