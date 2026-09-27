import type { CommandDoc } from '../types/command';

/*
 * Fiches en anglais, dans un fichier à part : elles ne sont téléchargées
 * que si le visiteur choisit l'anglais (voir loadEnglishCommands dans ./index.ts).
 */
const modules = import.meta.glob<CommandDoc>('./commands/en/*.json', { eager: true, import: 'default' });

export const ENGLISH_DOCS: CommandDoc[] = Object.values(modules);
export const ENGLISH_FILES = Object.keys(modules);
