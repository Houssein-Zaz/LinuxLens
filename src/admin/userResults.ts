import { EXERCISE_BY_ID } from '../data/exercises';
import { computeStats, type Stats } from '../lib/stats';
import type { AdminAttempt } from '../types/backend';
import type { CategoryId } from '../types/command';

export interface CategoryResult {
  category: CategoryId;
  attempts: number;
  correct: number;
  /** Part des réponses justes, de 0 à 1. */
  rate: number;
}

export interface UserResults extends Stats {
  /** Du plus faible au plus fort. */
  byCategory: CategoryResult[];
  /** Catégorie la moins réussie (au moins MIN_ATTEMPTS réponses et pas 100 %), sinon null. */
  weakest: CategoryResult | null;
  lastActivity: string;
}

/** En dessous, un taux de réussite ne dit pas grand-chose. */
export const MIN_ATTEMPTS = 3;

function categoryResults(attempts: readonly AdminAttempt[]): CategoryResult[] {
  const totals = new Map<CategoryId, { attempts: number; correct: number }>();
  for (const a of attempts) {
    const category = EXERCISE_BY_ID.get(a.exerciseId)?.category;
    if (!category) continue; // exercice retiré du site depuis
    const t = totals.get(category) ?? { attempts: 0, correct: 0 };
    t.attempts++;
    if (a.correct) t.correct++;
    totals.set(category, t);
  }
  return [...totals]
    .map(([category, t]) => ({ category, ...t, rate: t.correct / t.attempts }))
    .sort((a, b) => a.rate - b.rate || b.attempts - a.attempts);
}

/** Scores et points faibles de chaque utilisateur, à partir des réponses de tous. */
export function resultsByUser(attempts: readonly AdminAttempt[]): Map<string, UserResults> {
  const perUser = new Map<string, AdminAttempt[]>();
  for (const a of attempts) {
    const list = perUser.get(a.userId);
    if (list) list.push(a);
    else perUser.set(a.userId, [a]);
  }

  const results = new Map<string, UserResults>();
  for (const [userId, list] of perUser) {
    const stats = computeStats(
      list.map((a) => ({ ...a, answer: '' })),
      3,
    );
    const byCategory = categoryResults(list);
    const weakest = byCategory.find((c) => c.attempts >= MIN_ATTEMPTS && c.rate < 1) ?? null;
    const lastActivity = list.reduce((max, a) => (a.createdAt > max ? a.createdAt : max), list[0]!.createdAt);
    results.set(userId, { ...stats, byCategory, weakest, lastActivity });
  }
  return results;
}
