export type TokenKind =
  | 'command'
  | 'subcommand'
  | 'option'
  | 'option-value'
  | 'argument'
  | 'chmod-mode'
  | 'assignment'
  | 'pipe'
  | 'chain'
  | 'redirect'
  | 'redirect-target'
  | 'comment';

export type ControlOperator = '|' | '|&' | '&&' | '||' | ';' | '&';

export interface Token {
  kind: TokenKind;
  /** Texte exact de la saisie, entre `start` et `end` (guillemets compris). */
  raw: string;
  /** Valeur normalisée : sans guillemets, `-a` pour un flag extrait de `-la`, `--color` pour `--color=auto`. */
  value: string;
  start: number;
  end: number;
  /** Commande à laquelle se rattache le token (options, arguments…). */
  command?: string;
  /** Groupe d'origine pour les options courtes groupées (`-la`). */
  groupedFrom?: string;
  /** Valeur collée à l'option : `--color=auto` → `auto`, `-n5` → `5`. */
  inlineValue?: string;
  quoted?: 'single' | 'double';
  chmodNotation?: 'octal' | 'symbolic';
}

export type RedirectKind = 'write' | 'append' | 'read' | 'heredoc' | 'herestring' | 'duplicate' | 'write-both' | 'append-both';

export interface Redirect {
  /** Opérateur complet tel que saisi : `>`, `2>>`, `2>&1`, `&>`… */
  op: string;
  kind: RedirectKind;
  /** Descripteur redirigé (0 entrée, 1 sortie, 2 erreurs), `null` pour `&>`. */
  fd: number | null;
  /** Fichier ou descripteur cible, `null` si manquant. */
  target: string | null;
}

export interface Segment {
  /** Commande principale du segment (la première), `null` si aucune. */
  command: string | null;
  /** Toutes les commandes du segment : `sudo ls` → `['sudo', 'ls']`. */
  commands: string[];
  tokens: Token[];
  redirects: Redirect[];
  /** Opérateur qui relie ce segment au suivant. */
  next?: ControlOperator;
}

export interface ParseError {
  message: string;
  start: number;
  end: number;
}

export interface ParsedLine {
  input: string;
  segments: Segment[];
  errors: ParseError[];
}

/** Informations optionnelles fournies par les fiches de commandes. */
export interface ParserSpec {
  /** L'option attend-elle une valeur (`head -n 5`, `tar -f archive`) ? */
  takesValue?(command: string, option: string): boolean | undefined;
  /** Le mot est-il une sous-commande connue (`apt install`) ? */
  isSubcommand?(command: string, word: string): boolean;
}
