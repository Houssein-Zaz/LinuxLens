import { COMMANDS } from '../data';
import type { CommandDoc, CommandOption } from '../types/command';
import type { ParserSpec } from '../types/parser';

export function getCommand(name: string): CommandDoc | undefined {
  return COMMANDS.get(name);
}

export function allCommands(): CommandDoc[] {
  return [...COMMANDS.values()];
}

/** Trouve l'option d'une fiche : `-l`, `--all`, ou `--color` pour `--color=auto`. */
export function findOption(doc: CommandDoc, flag: string): CommandOption | undefined {
  return doc.options.find((o) => o.short === flag || o.long === flag);
}

/** Relie le parseur aux fiches : une option à valeur consomme le mot suivant. */
export const registrySpec: ParserSpec = {
  takesValue(command, option) {
    const doc = COMMANDS.get(command);
    if (!doc) return undefined;
    const opt = findOption(doc, option);
    return opt ? opt.takesValue === true : undefined;
  },
  isSubcommand(command, word) {
    return COMMANDS.get(command)?.subcommands?.some((s) => s.name === word) ?? false;
  },
};

/**
 * Suggestions d'autocomplétion : d'abord les noms qui commencent par la saisie,
 * puis ceux qui la contiennent. `extra` ajoute des noms venus d'ailleurs (tldr).
 */
export function suggestCommands(query: string, extra: Iterable<string> = [], limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const names = new Set<string>([...COMMANDS.keys(), ...extra]);
  const prefix: string[] = [];
  const contains: string[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower.startsWith(q)) prefix.push(name);
    else if (lower.includes(q)) contains.push(name);
  }
  const byDetailedThenLength = (a: string, b: string) =>
    Number(COMMANDS.has(b)) - Number(COMMANDS.has(a)) || a.length - b.length || a.localeCompare(b);
  return [...prefix.sort(byDetailedThenLength), ...contains.sort(byDetailedThenLength)].slice(0, limit);
}
