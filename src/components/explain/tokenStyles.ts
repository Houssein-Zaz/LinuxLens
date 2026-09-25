import type { TokenKind } from '../../types/parser';

/** Couleurs douces par type de token ; contrastes AA vérifiés en clair et en sombre. */
export const TOKEN_STYLE: Record<TokenKind, string> = {
  command: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-400/15 dark:text-indigo-300 dark:ring-indigo-400/30',
  subcommand: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/30',
  option: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/30',
  'option-value': 'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-400/15 dark:text-orange-300 dark:ring-orange-400/30',
  argument: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/30',
  'chmod-mode': 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-sky-400/30',
  assignment: 'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200 dark:bg-fuchsia-400/15 dark:text-fuchsia-300 dark:ring-fuchsia-400/30',
  pipe: 'bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:ring-zinc-600',
  chain: 'bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:ring-zinc-600',
  redirect: 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-600/30 dark:text-slate-200 dark:ring-slate-500',
  'redirect-target': 'bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-400/15 dark:text-teal-300 dark:ring-teal-400/30',
  comment: 'bg-transparent text-zinc-500 italic ring-transparent dark:text-zinc-400',
};

/** Types affichés dans la légende, dans l'ordre. */
export const LEGEND: Array<{ kind: TokenKind; label: string }> = [
  { kind: 'command', label: 'Commande' },
  { kind: 'option', label: 'Option' },
  { kind: 'option-value', label: "Valeur d'option" },
  { kind: 'argument', label: 'Argument' },
  { kind: 'chmod-mode', label: 'Mode chmod' },
  { kind: 'pipe', label: 'Opérateur' },
  { kind: 'redirect', label: 'Redirection' },
];
