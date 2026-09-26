import { resultsByUser } from '../userResults';
import type { AdminAttempt } from '../../types/backend';

let t = 0;
const at = (userId: string, exerciseId: string, correct: boolean): AdminAttempt => ({
  userId,
  exerciseId,
  kind: exerciseId.startsWith('p-') ? 'perm' : 'write',
  correct,
  usedHelp: false,
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, t++)).toISOString(),
});

// w-pwd, w-ls-la : fichiers ; p-to-octal-644 : permissions
describe('resultsByUser', () => {
  it('sépare les utilisateurs et calcule leurs scores', () => {
    const r = resultsByUser([at('sara', 'w-pwd', true), at('lea', 'w-pwd', false), at('sara', 'w-ls-la', false), at('sara', 'w-ls-la', true)]);
    expect(r.get('sara')).toMatchObject({ attempts: 3, correct: 2, solved: 2, firstTry: 1 });
    expect(r.get('lea')).toMatchObject({ attempts: 1, correct: 0, solved: 0 });
    expect(r.has('personne')).toBe(false);
  });

  it('point faible : la catégorie la moins réussie, avec assez de réponses', () => {
    const attempts = [
      at('sara', 'w-pwd', true),
      at('sara', 'w-pwd', true),
      at('sara', 'w-ls-la', false),
      at('sara', 'p-to-octal-644', false),
      at('sara', 'p-to-octal-644', false),
      at('sara', 'p-to-octal-644', true),
    ];
    const r = resultsByUser([...attempts].reverse()).get('sara')!;
    expect(r.byCategory.map((c) => c.category)).toEqual(['permissions', 'files']);
    expect(r.weakest).toMatchObject({ category: 'permissions', attempts: 3, correct: 1 });
    expect(r.lastActivity).toBe(attempts.at(-1)!.createdAt);
  });

  it('pas de point faible sans assez de réponses, ni quand tout est juste', () => {
    expect(resultsByUser([at('a', 'p-to-octal-644', false), at('a', 'p-to-octal-644', false)]).get('a')!.weakest).toBeNull();
    expect(resultsByUser([at('b', 'w-pwd', true), at('b', 'w-pwd', true), at('b', 'w-ls-la', true)]).get('b')!.weakest).toBeNull();
  });
});
