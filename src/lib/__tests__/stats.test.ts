import { computeStats } from '../stats';
import type { Attempt } from '../../types/backend';

let t = 0;
const at = (exerciseId: string, correct: boolean, extra: Partial<Attempt> = {}): Attempt => ({
  exerciseId,
  kind: 'write',
  correct,
  answer: '',
  usedHelp: false,
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, t++)).toISOString(),
  ...extra,
});

describe('computeStats', () => {
  it('sans essai : tout à zéro', () => {
    const s = computeStats([]);
    expect(s).toMatchObject({ attempts: 0, correct: 0, successRate: 0, solved: 0, firstTry: 0, toReview: [] });
  });

  it('compte essais, réussites, premier coup et types', () => {
    const s = computeStats([
      at('a', true), // premier coup
      at('b', false),
      at('b', true), // réussi après une erreur
      at('c', true, { usedHelp: true, kind: 'perm' }), // juste mais avec aide : pas « premier coup »
      at('d', false, { kind: 'quiz' }), // jamais réussi
    ]);
    expect(s.attempts).toBe(5);
    expect(s.correct).toBe(3);
    expect(s.successRate).toBeCloseTo(0.6);
    expect(s.exercises).toBe(4);
    expect(s.solved).toBe(3);
    expect(s.firstTry).toBe(1);
    expect(s.byKind.write).toEqual({ attempts: 3, correct: 2, solved: 2 });
    expect(s.byKind.perm).toEqual({ attempts: 1, correct: 1, solved: 1 });
    expect(s.byKind.quiz).toEqual({ attempts: 1, correct: 0, solved: 0 });
  });

  it('le premier essai se lit dans l’ordre chronologique, quel que soit l’ordre reçu', () => {
    const first = at('a', false);
    const second = at('a', true);
    expect(computeStats([second, first]).firstTry).toBe(0);
  });

  it('à revoir : non réussis d’abord, puis par nombre d’erreurs', () => {
    const s = computeStats([at('x', false), at('x', false), at('x', false), at('x', true), at('y', false), at('z', false), at('z', false)]);
    expect(s.toReview).toEqual([
      { exerciseId: 'z', errors: 2, solved: false },
      { exerciseId: 'y', errors: 1, solved: false },
      { exerciseId: 'x', errors: 3, solved: true },
    ]);
  });
});
