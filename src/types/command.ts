export const CATEGORY_IDS = [
  'files',
  'reading',
  'text',
  'permissions',
  'processes',
  'system',
  'network',
  'archives',
  'packages',
  'misc',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type DangerLevel = 'safe' | 'caution' | 'danger';

export interface CommandOption {
  /** Forme courte : `-l`. */
  short?: string;
  /** Forme longue : `--all`. */
  long?: string;
  description: string;
  /** L'option attend une valeur (`-n 5`, `--color=auto`). */
  takesValue?: boolean;
  /** Nom de la valeur affiché dans l'aide : `NOMBRE`, `FICHIER`. */
  valueName?: string;
  /** Valeurs possibles, si l'ensemble est fermé. */
  values?: string[];
}

export interface CommandArgument {
  name: string;
  description: string;
  optional?: boolean;
  /** Peut être répété (`FICHIER...`). */
  variadic?: boolean;
}

export interface Subcommand {
  name: string;
  description: string;
}

export interface CommandExample {
  command: string;
  explanation: string;
  /** Exemple de sortie, affiché tel quel. */
  output?: string;
}

/** Fiche détaillée, écrite à la main dans `src/data/commands/<name>.json`. */
export interface CommandDoc {
  name: string;
  category: CategoryId;
  /** Une phrase, affichée dans les listes et l'autocomplétion. */
  summary: string;
  description: string;
  synopsis: string;
  options: CommandOption[];
  arguments?: CommandArgument[];
  subcommands?: Subcommand[];
  examples: CommandExample[];
  seeAlso?: string[];
  dangerLevel?: DangerLevel;
  /** Explication du risque quand `dangerLevel` n'est pas `safe`. */
  dangerNote?: string;
}

/** Fiche issue de tldr-pages, générée par `scripts/build-tldr.ts`. */
export interface TldrDoc {
  name: string;
  summary: string;
  examples: Array<{ description: string; command: string }>;
  lang: 'fr' | 'en';
  platform: 'common' | 'linux';
  sourceUrl: string;
  moreInfoUrl?: string;
}

/** Entrée de l'index tldr (chargé au démarrage, fiches complètes à la demande). */
export interface TldrIndexEntry {
  name: string;
  summary: string;
  lang: 'fr' | 'en';
}
