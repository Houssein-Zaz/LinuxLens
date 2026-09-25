import { COMMAND_FILES, COMMANDS } from '..';
import { validateCommandDoc } from '../../lib/schema';
import { parseCommandLine } from '../../lib/parser';
import { registrySpec } from '../../lib/registry';

const docs = [...COMMANDS.values()];

describe('fiches de commandes', () => {
  it('au moins 20 fiches détaillées', () => {
    expect(docs.length).toBeGreaterThanOrEqual(20);
  });

  it.each(docs.map((d) => [d.name, d] as const))('%s respecte le schéma', (_name, doc) => {
    expect(validateCommandDoc(doc)).toEqual([]);
  });

  it('le nom de fichier correspond au nom de la commande', () => {
    for (const file of COMMAND_FILES) {
      const name = file.replace(/^.*\/(.+)\.json$/, '$1');
      expect(COMMANDS.get(name)?.name).toBe(name);
    }
  });

  it.each(docs.map((d) => [d.name, d] as const))('%s : chaque exemple commence par la commande et se parse', (name, doc) => {
    for (const ex of doc.examples) {
      const parsed = parseCommandLine(ex.command, registrySpec);
      expect(parsed.errors, ex.command).toEqual([]);
      expect(parsed.segments.flatMap((s) => s.commands), ex.command).toContain(name);
    }
  });

  it('seeAlso ne se référence pas lui-même', () => {
    for (const doc of docs) expect(doc.seeAlso ?? []).not.toContain(doc.name);
  });
});

describe('validateCommandDoc', () => {
  const valid = {
    name: 'x',
    category: 'misc',
    summary: 's',
    description: 'd',
    synopsis: 'x',
    options: [{ short: '-a', description: 'a' }],
    examples: [{ command: 'x -a', explanation: 'e' }],
  };

  it('accepte une fiche minimale', () => {
    expect(validateCommandDoc(valid)).toEqual([]);
  });

  it('détecte les erreurs courantes', () => {
    expect(validateCommandDoc({ ...valid, category: 'oops' })).toEqual(['category invalide : oops']);
    expect(validateCommandDoc({ ...valid, extra: 1 })).toEqual(['champ inconnu : extra']);
    expect(validateCommandDoc({ ...valid, examples: [] })).toEqual(['examples : au moins un exemple attendu']);
    expect(validateCommandDoc({ ...valid, options: [{ short: 'a', description: 'a' }] })).toEqual([
      'options[0].short invalide : a',
    ]);
    expect(
      validateCommandDoc({ ...valid, options: [{ short: '-a', description: 'a' }, { short: '-a', description: 'b' }] }),
    ).toEqual(['option en double : -a']);
    expect(validateCommandDoc({ ...valid, dangerLevel: 'danger' })).toEqual([
      'dangerNote requis quand dangerLevel vaut caution ou danger',
    ]);
  });
});
