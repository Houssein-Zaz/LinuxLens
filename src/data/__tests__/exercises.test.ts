import { ALL_EXERCISES, QUIZ_EXERCISES, WRITE_EXERCISES } from '../exercises';
import { checkCommand } from '../../lib/exercise';
import { parseCommandLine } from '../../lib/parser';
import { registrySpec } from '../../lib/registry';
import { fromOctal } from '../../lib/permissions';
import { CATEGORY_IDS } from '../../types/command';

describe('exercices', () => {
  it('identifiants uniques et catégories valides', () => {
    const ids = ALL_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of ALL_EXERCISES) expect(CATEGORY_IDS).toContain(e.category);
  });

  it('chaque catégorie a au moins un exercice « écrire »', () => {
    for (const c of CATEGORY_IDS) expect(WRITE_EXERCISES.some((e) => e.category === c), c).toBe(true);
  });

  it.each(WRITE_EXERCISES.map((e) => [e.id, e] as const))('%s : solutions valides et acceptées', (_id, e) => {
    for (const s of e.solutions) {
      expect(parseCommandLine(s, registrySpec).errors, s).toEqual([]);
      expect(checkCommand(s, e.solutions, e.ignoreOptions).ok, s).toBe(true);
    }
  });

  it.each(QUIZ_EXERCISES.map((e) => [e.id, e] as const))('%s : QCM cohérent', (_id, e) => {
    expect(e.choices.length).toBeGreaterThanOrEqual(3);
    expect(e.answer).toBeGreaterThanOrEqual(0);
    expect(e.answer).toBeLessThan(e.choices.length);
    expect(new Set(e.choices).size).toBe(e.choices.length);
    expect(parseCommandLine(e.command, registrySpec).errors).toEqual([]);
  });

  it('modes de permissions valides', () => {
    for (const e of ALL_EXERCISES) if (e.kind === 'perm') expect(fromOctal(e.mode), e.mode).not.toBeNull();
  });

  it('les réponses naturelles des débutants sont acceptées', () => {
    const byId = (id: string) => WRITE_EXERCISES.find((e) => e.id === id)!;
    const accepts = (id: string, answer: string) => {
      const e = byId(id);
      expect(checkCommand(answer, e.solutions, e.ignoreOptions).ok, answer).toBe(true);
    };
    accepts('w-ls-la', 'ls -al');
    accepts('w-ls-la', 'ls -l --all');
    accepts('w-chmod-755', 'chmod u=rwx,go=rx deploy.sh');
    accepts('w-chmod-755', 'chmod 0755 deploy.sh');
    accepts('w-cut', "cut -d ':' -f 1 /etc/passwd");
    accepts('w-tar-c', 'tar -czvf projet.tar.gz projet/');
    accepts('w-sort-nr', 'sort -rn nombres.txt');
    accepts('w-grep-i', 'grep -i "error" app.log');
    accepts('w-grep-rn', 'grep -nr TODO src/');
    accepts('w-apt-install', 'sudo apt install -y htop');
  });
});
