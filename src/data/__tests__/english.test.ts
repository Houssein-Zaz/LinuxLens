import { COMMANDS, loadEnglishCommands } from '..';
import { ENGLISH_FILES } from '../commands-en';
import { QUIZ_EXERCISES, WRITE_EXERCISES } from '../exercises';
import { QUIZ_EN, WRITE_EN } from '../exercises.en';
import { validateCommandDoc } from '../../lib/schema';
import { parseCommandLine } from '../../lib/parser';
import { findOption, registrySpec } from '../../lib/registry';
import type { CommandDoc } from '../../types/command';

const COMMANDS_EN = await loadEnglishCommands();
const pairs = [...COMMANDS.values()].map((fr) => [fr.name, fr, COMMANDS_EN.get(fr.name)] as const);

/** Ce qui doit être identique dans les deux langues : ce que le parseur et la correction utilisent. */
const structure = (d: CommandDoc) => ({
  category: d.category,
  dangerLevel: d.dangerLevel,
  seeAlso: d.seeAlso,
  options: d.options.map((o) => [o.short, o.long, o.takesValue ?? false, o.values, Boolean(o.example)]),
  arguments: d.arguments?.map((a) => [a.optional ?? false, a.variadic ?? false]),
  subcommands: d.subcommands?.map((s) => [s.name, s.arguments?.map((a) => a.variadic ?? false)]),
});

describe('fiches en anglais', () => {
  it('chaque fiche française a sa traduction, et inversement', () => {
    expect([...COMMANDS_EN.keys()]).toEqual([...COMMANDS.keys()]);
    for (const file of ENGLISH_FILES) {
      const name = file.replace(/^.*\/(.+)\.json$/, '$1');
      expect(COMMANDS_EN.get(name)?.name).toBe(name);
    }
  });

  it.each(pairs)('%s : schéma valide et même structure que la fiche française', (_name, fr, en) => {
    expect(en).toBeDefined();
    expect(validateCommandDoc(en)).toEqual([]);
    expect(structure(en!)).toEqual(structure(fr));
    expect(en!.dangerNote === undefined).toBe(fr.dangerNote === undefined);
  });

  it.each(pairs)('%s : exemples qui se parsent et options illustrées', (name, _fr, en) => {
    for (const ex of en!.examples) {
      const parsed = parseCommandLine(ex.command, registrySpec);
      expect(parsed.errors, ex.command).toEqual([]);
      expect(parsed.segments.flatMap((s) => s.commands), ex.command).toContain(name);
    }
    for (const opt of en!.options) {
      if (!opt.example) continue;
      const tokens = parseCommandLine(opt.example.command, registrySpec).segments.flatMap((s) => s.tokens);
      const uses = tokens.some((t) => t.kind === 'option' && t.command === name && findOption(en!, t.value) === opt);
      expect(uses, `${name} ${opt.short ?? opt.long} : ${opt.example.command}`).toBe(true);
    }
  });

  it('pas de guillemets français oubliés dans les textes anglais', () => {
    const leftovers = [...COMMANDS_EN.values()].filter((d) => /[«»]/.test(JSON.stringify(d))).map((d) => d.name);
    expect(leftovers).toEqual([]);
  });
});

describe('exercices en anglais', () => {
  it('chaque exercice a sa traduction', () => {
    expect(WRITE_EXERCISES.filter((e) => !WRITE_EN[e.id]).map((e) => e.id)).toEqual([]);
    expect(QUIZ_EXERCISES.filter((e) => !QUIZ_EN[e.id]).map((e) => e.id)).toEqual([]);
  });

  it('aucune traduction orpheline', () => {
    const ids = new Set([...WRITE_EXERCISES, ...QUIZ_EXERCISES].map((e) => e.id));
    expect([...Object.keys(WRITE_EN), ...Object.keys(QUIZ_EN)].filter((id) => !ids.has(id))).toEqual([]);
  });

  it.each(QUIZ_EXERCISES.map((e) => [e.id, e] as const))('%s : autant de choix que la version française', (id, e) => {
    const en = QUIZ_EN[id]!;
    expect(en.choices).toHaveLength(e.choices.length);
    expect(new Set(en.choices).size).toBe(en.choices.length);
  });
});
