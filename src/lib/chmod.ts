const OCTAL_RE = /^[0-7]{3,4}$/;
// [ugoa]*  suivi d'une ou plusieurs actions (+|-|=)(perms|u|g|o), clauses séparées par des virgules
const SYMBOLIC_CLAUSE = '[ugoa]*(?:[+=-](?:[rwxXst]*|[ugo]))+';
const SYMBOLIC_RE = new RegExp(`^${SYMBOLIC_CLAUSE}(?:,${SYMBOLIC_CLAUSE})*$`);

/** `755`, `0644`, `4755`. */
export function isOctalMode(word: string): boolean {
  return OCTAL_RE.test(word);
}

/** `u+x`, `go-w`, `a=r`, `u=rwx,g=rx,o=`, `+x`. */
export function isSymbolicMode(word: string): boolean {
  return SYMBOLIC_RE.test(word);
}

export function chmodNotation(word: string): 'octal' | 'symbolic' | null {
  if (isOctalMode(word)) return 'octal';
  if (isSymbolicMode(word)) return 'symbolic';
  return null;
}
