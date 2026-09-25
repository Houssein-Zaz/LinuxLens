import type { CommandDoc } from '../types/command';

const modules = import.meta.glob<CommandDoc>('./commands/*.json', { eager: true, import: 'default' });

/** Fiches détaillées, indexées par nom de commande. La validité est garantie par `schema.test.ts`. */
export const COMMANDS: ReadonlyMap<string, CommandDoc> = new Map(
  Object.values(modules)
    .map((doc) => [doc.name, doc] as const)
    .sort(([a], [b]) => a.localeCompare(b)),
);

/** Chemins des fichiers sources, pour les tests (nom de fichier = nom de commande). */
export const COMMAND_FILES = Object.keys(modules);
