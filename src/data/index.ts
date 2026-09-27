import type { CommandDoc } from '../types/command';

const modules = import.meta.glob<CommandDoc>('./commands/*.json', { eager: true, import: 'default' });

const byName = (docs: Iterable<CommandDoc>): ReadonlyMap<string, CommandDoc> =>
  new Map([...docs].map((doc) => [doc.name, doc] as const).sort(([a], [b]) => a.localeCompare(b)));

/** Fiches détaillées en français, indexées par nom de commande. La validité est garantie par `schema.test.ts`. */
export const COMMANDS: ReadonlyMap<string, CommandDoc> = byName(Object.values(modules));

/** Chemins des fichiers sources, pour les tests (nom de fichier = nom de commande). */
export const COMMAND_FILES = Object.keys(modules);

let english: ReadonlyMap<string, CommandDoc> | null = null;
let englishLoading: Promise<ReadonlyMap<string, CommandDoc>> | null = null;

/** Traduction anglaise des fiches (`commands/en/<nom>.json`), ou `null` tant qu'elle n'est pas chargée. */
export const englishCommands = () => english;

/** Charge la traduction anglaise des fiches (un seul fichier, téléchargé à la demande). */
export function loadEnglishCommands(): Promise<ReadonlyMap<string, CommandDoc>> {
  englishLoading ??= import('./commands-en')
    .then((m) => (english = byName(m.ENGLISH_DOCS)))
    .catch((err: unknown) => {
      englishLoading = null; // nouvel essai possible (réseau)
      throw err;
    });
  return englishLoading;
}
