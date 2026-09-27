import type { ParsedLine } from '../types/parser';
import { applyChmod, emptyPermissions, fromOctal, fromSymbolic, toOctal, toSymbolic } from './permissions';
import { parseCommandLine } from './parser';
import { findOption, getCommand, registrySpec } from './registry';
import { getLang, tr } from '../i18n';

/**
 * Forme canonique d'une ligne de commande, pour comparer deux écritures équivalentes :
 * `ls -la` = `ls -al` = `ls -l --all`, `head -n5` = `head -n 5`, `"motif"` = `motif`,
 * `chmod 755` = `chmod u=rwx,go=rx`, `projet/` = `projet`.
 */
export interface CanonicalSegment {
  commands: string[];
  /** `ls:-a`, `head:-n=5` — triés, l'ordre des options n'a pas d'importance. */
  options: string[];
  /** Arguments dans l'ordre : `cp:source`, `cp:dest`. */
  positionals: string[];
  redirects: string[];
  next: string | null;
}

export interface Canonical {
  segments: CanonicalSegment[];
  errors: string[];
}

const full = () => fromOctal('777')!;

/** Mode chmod canonique : octal si le résultat ne dépend pas des droits de départ. */
function canonicalMode(mode: string): string {
  const octal = fromOctal(mode);
  if (octal) return toOctal(octal);
  const fromEmpty = applyChmod(emptyPermissions(), mode);
  const fromFull = applyChmod(full(), mode);
  if (fromEmpty && fromFull && toOctal(fromEmpty) === toOctal(fromFull)) return toOctal(fromEmpty);
  return mode;
}

function canonicalPath(value: string): string {
  let v = value;
  if (v.length > 2 && v.startsWith('./')) v = v.slice(2);
  if (v.length > 1 && v.endsWith('/')) v = v.replace(/\/+$/, '');
  return v;
}

/** Forme courte si la fiche la connaît : `--all` → `-a`. */
function canonicalFlag(command: string | undefined, flag: string): string {
  const doc = command ? getCommand(command) : undefined;
  const opt = doc && findOption(doc, flag);
  return opt ? (opt.short ?? opt.long ?? flag) : flag;
}

export function canonicalize(input: string, parsed: ParsedLine = parseCommandLine(input, registrySpec)): Canonical {
  const segments = parsed.segments.map((seg): CanonicalSegment => {
    const options: string[] = [];
    const positionals: string[] = [];
    const redirects: string[] = [];
    const tokens = seg.tokens;

    tokens.forEach((t, i) => {
      const owner = t.command ?? '';
      switch (t.kind) {
        case 'option': {
          const next = tokens[i + 1];
          const value = t.inlineValue ?? (next?.kind === 'option-value' ? next.value : undefined);
          options.push(`${owner}:${canonicalFlag(t.command, t.value)}${value !== undefined ? `=${value}` : ''}`);
          break;
        }
        case 'argument':
        case 'subcommand':
          positionals.push(`${owner}:${canonicalPath(t.value)}`);
          break;
        case 'chmod-mode':
          positionals.push(`${owner}:${canonicalMode(t.value)}`);
          break;
      }
    });
    for (const r of seg.redirects) redirects.push(`${r.kind}:${r.fd ?? '&'}:${canonicalPath(r.target ?? '')}`);

    return { commands: seg.commands, options: options.sort(), positionals, redirects, next: seg.next ?? null };
  });
  return { segments, errors: parsed.errors.map((e) => e.message) };
}

export type CheckResult = { ok: true; matched: string } | { ok: false; messages: string[] };

const flagOf = (option: string) => option.replace(/=.*$/, '');
const shown = (key: string) => key.slice(key.indexOf(':') + 1);

/** Différences entre la réponse et une solution, formulées sans dévoiler la solution. */
function compare(user: CanonicalSegment[], expected: CanonicalSegment[], ignore: Set<string>): string[] {
  if (user.length !== expected.length) {
    return [
      expected.length > user.length
        ? tr(
            `La solution attendue enchaîne ${expected.length} commandes : il en manque dans votre réponse.`,
            `The expected solution chains ${expected.length} commands: some are missing from your answer.`,
          )
        : tr(
            `Votre réponse enchaîne ${user.length} commandes, la solution n’en demande que ${expected.length}.`,
            `Your answer chains ${user.length} commands, the solution only needs ${expected.length}.`,
          ),
    ];
  }
  const en = getLang() === 'en';
  const messages: string[] = [];
  expected.forEach((exp, i) => {
    const got = user[i]!;
    const where = expected.length > 1 ? tr(` (commande ${i + 1})`, ` (command ${i + 1})`) : '';
    if (got.commands.join(' ') !== exp.commands.join(' ')) {
      const name = got.commands.at(-1) ?? '';
      messages.push(
        name
          ? tr(`« ${name} » n’est pas la commande attendue${where}.`, `“${name}” is not the expected command${where}.`)
          : tr(`Il manque la commande${where}.`, `The command is missing${where}.`),
      );
      return;
    }
    const gotOptions = got.options.filter((o) => !ignore.has(flagOf(shown(o))));
    const missing = exp.options.filter((o) => !gotOptions.includes(o));
    const extra = gotOptions.filter((o) => !exp.options.includes(o));
    for (const e of extra) {
      const sameFlag = missing.find((m) => flagOf(m) === flagOf(e));
      if (sameFlag) {
        messages.push(tr(`La valeur donnée à ${flagOf(shown(e))} n’est pas la bonne${where}.`, `The value given to ${flagOf(shown(e))} is not the right one${where}.`));
      } else messages.push(tr(`L’option ${shown(e)} n’est pas nécessaire ici${where}.`, `The option ${shown(e)} is not needed here${where}.`));
    }
    const reallyMissing = missing.filter((m) => !extra.some((e) => flagOf(e) === flagOf(m)));
    if (reallyMissing.length) {
      const n = reallyMissing.length;
      messages.push(
        en
          ? `${n === 1 ? 'An option is' : `${n} options are`} missing${where}.`
          : `Il manque ${n === 1 ? 'une option' : `${n} options`}${where}.`,
      );
    }
    if (got.positionals.join('\n') !== exp.positionals.join('\n')) {
      const want = exp.positionals.length;
      const plural = want > 1 ? 's' : '';
      messages.push(
        got.positionals.length === want
          ? tr(`Vérifiez les arguments (noms de fichiers, motif, mode…)${where}.`, `Check the arguments (file names, pattern, mode…)${where}.`)
          : tr(
              `La solution attend ${want} argument${plural}, vous en avez donné ${got.positionals.length}${where}.`,
              `The solution expects ${want} argument${plural}, you gave ${got.positionals.length}${where}.`,
            ),
      );
    }
    if (got.redirects.join() !== exp.redirects.join()) {
      messages.push(
        exp.redirects.length
          ? tr(`Vérifiez la redirection${where}.`, `Check the redirection${where}.`)
          : tr(`Aucune redirection n’est nécessaire${where}.`, `No redirection is needed${where}.`),
      );
    }
    if (got.next !== exp.next) messages.push(tr(`Vérifiez l’opérateur qui relie les commandes${where}.`, `Check the operator that links the commands${where}.`));
  });
  return messages;
}

/**
 * Vérifie une réponse contre une ou plusieurs solutions acceptées.
 * `ignoreOptions` : options tolérées en plus (`-v`…).
 */
export function checkCommand(input: string, solutions: string[], ignoreOptions: string[] = []): CheckResult {
  if (!input.trim()) return { ok: false, messages: [tr('Tapez une commande.', 'Type a command.')] };
  const user = canonicalize(input);
  if (user.errors.length) return { ok: false, messages: user.errors };

  const ignore = new Set(ignoreOptions);
  let best: string[] | null = null;
  for (const solution of solutions) {
    const messages = compare(user.segments, canonicalize(solution).segments, ignore);
    if (messages.length === 0) return { ok: true, matched: solution };
    if (!best || messages.length < best.length) best = messages;
  }
  return { ok: false, messages: best ?? [tr('Réponse incorrecte.', 'Incorrect answer.')] };
}

/* ------------------------------------------------------------------ */
/* Conversions de permissions                                          */
/* ------------------------------------------------------------------ */

/** Accepte `750`, `0750`. */
export function checkOctalAnswer(input: string, expectedSymbolic: string): boolean {
  const p = fromOctal(input.trim());
  return p !== null && toSymbolic(p) === expectedSymbolic;
}

/** Accepte `rwxr-x---` et `-rwxr-x---` (avec le caractère de type de ls -l). */
export function checkSymbolicAnswer(input: string, expectedOctal: string): boolean {
  let s = input.trim();
  if (s.length === 10 && /^[-dl]/.test(s)) s = s.slice(1);
  const p = fromSymbolic(s);
  return p !== null && toOctal(p) === expectedOctal;
}
