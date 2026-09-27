import { tr } from '../i18n';
import type {
  ControlOperator,
  ParsedLine,
  ParseError,
  ParserSpec,
  Redirect,
  RedirectKind,
  Segment,
  Token,
} from '../types/parser';
import { chmodNotation } from './chmod';

/* ------------------------------------------------------------------ */
/* Lexer : découpe la saisie en mots et opérateurs                     */
/* ------------------------------------------------------------------ */

type Lexeme =
  | { type: 'word'; raw: string; value: string; start: number; end: number; quoted?: 'single' | 'double' }
  | { type: 'control'; op: ControlOperator; start: number; end: number }
  | { type: 'redirect'; raw: string; redirect: Redirect; complete: boolean; start: number; end: number }
  | { type: 'comment'; raw: string; start: number; end: number };

const CONTROL_OPS: ControlOperator[] = ['&&', '||', '|&', '|', ';', '&'];
// fd optionnel + opérateur ; `>&N` embarque directement sa cible
const REDIRECT_RE = /^(\d+)?(&>>|&>|>>|>&(\d+|-)?|<<<|<<|<>|>\||>|<)/;
const WORD_BREAK = new Set([' ', '\t', '\n', '|', '&', ';', '<', '>']);

function redirectFromMatch(fdText: string | undefined, op: string, dupTarget: string | undefined) {
  const explicitFd = fdText === undefined ? undefined : Number(fdText);
  const table: Record<string, { kind: RedirectKind; fd: number | null }> = {
    '>': { kind: 'write', fd: 1 },
    '>|': { kind: 'write', fd: 1 },
    '>>': { kind: 'append', fd: 1 },
    '<': { kind: 'read', fd: 0 },
    '<>': { kind: 'read', fd: 0 },
    '<<': { kind: 'heredoc', fd: 0 },
    '<<<': { kind: 'herestring', fd: 0 },
    '&>': { kind: 'write-both', fd: null },
    '&>>': { kind: 'append-both', fd: null },
  };
  if (op.startsWith('>&')) {
    // `>&2` (duplication) ; `>& fichier` équivaut à `&>`
    if (dupTarget !== undefined) {
      return { kind: 'duplicate' as const, fd: explicitFd ?? 1, target: dupTarget };
    }
    return { kind: 'write-both' as const, fd: null, target: null };
  }
  const entry = table[op] ?? { kind: 'write' as const, fd: 1 };
  return { kind: entry.kind, fd: explicitFd ?? entry.fd, target: null };
}

function lex(input: string, errors: ParseError[]): Lexeme[] {
  const out: Lexeme[] = [];
  const n = input.length;
  let i = 0;

  while (i < n) {
    const c = input[i]!;
    if (c === ' ' || c === '\t' || c === '\n') {
      i++;
      continue;
    }

    if (c === '#') {
      out.push({ type: 'comment', raw: input.slice(i), start: i, end: n });
      break;
    }

    const rest = input.slice(i);
    const redirect = REDIRECT_RE.exec(rest);
    // `&&` est prioritaire sur `&>` ; un `&` seul n'est pas une redirection
    if (redirect && !rest.startsWith('&&')) {
      const [raw, fdText, op, dupTarget] = redirect;
      const info = redirectFromMatch(fdText, op!.replace(/\d+$|-$/, ''), dupTarget);
      out.push({
        type: 'redirect',
        raw,
        redirect: { op: raw, kind: info.kind, fd: info.fd, target: info.target },
        complete: info.target !== null,
        start: i,
        end: i + raw.length,
      });
      i += raw.length;
      continue;
    }

    const control = CONTROL_OPS.find((op) => rest.startsWith(op));
    if (control) {
      out.push({ type: 'control', op: control, start: i, end: i + control.length });
      i += control.length;
      continue;
    }

    // Mot
    const start = i;
    let value = '';
    let quoted: 'single' | 'double' | undefined;
    while (i < n && !WORD_BREAK.has(input[i]!)) {
      const ch = input[i]!;
      if (ch === "'") {
        const close = input.indexOf("'", i + 1);
        quoted ??= 'single';
        if (close === -1) {
          errors.push({ message: tr('Guillemet simple non fermé', 'Unclosed single quote'), start: i, end: n });
          value += input.slice(i + 1);
          i = n;
        } else {
          value += input.slice(i + 1, close);
          i = close + 1;
        }
      } else if (ch === '"') {
        quoted ??= 'double';
        let j = i + 1;
        let closed = false;
        while (j < n) {
          const d = input[j]!;
          if (d === '\\' && j + 1 < n && '"\\$`'.includes(input[j + 1]!)) {
            value += input[j + 1];
            j += 2;
          } else if (d === '"') {
            closed = true;
            j++;
            break;
          } else {
            value += d;
            j++;
          }
        }
        if (!closed) errors.push({ message: tr('Guillemet double non fermé', 'Unclosed double quote'), start: i, end: n });
        i = j;
      } else if (ch === '\\') {
        if (i + 1 < n) value += input[i + 1];
        i += 2;
      } else if (ch === '$' && (input[i + 1] === '(' || input[i + 1] === '{')) {
        const end = findClosing(input, i + 1);
        if (end === -1) {
          errors.push({ message: tr(`« ${input[i + 1] === '(' ? '$(' : '${'} » non fermé`, `Unclosed “${input[i + 1] === '(' ? '$(' : '${'}”`), start: i, end: n });
          value += input.slice(i);
          i = n;
        } else {
          value += input.slice(i, end + 1);
          i = end + 1;
        }
      } else if (ch === '`') {
        const close = input.indexOf('`', i + 1);
        if (close === -1) {
          errors.push({ message: tr('Accent grave (`) non fermé', 'Unclosed backtick (`)'), start: i, end: n });
          value += input.slice(i);
          i = n;
        } else {
          value += input.slice(i, close + 1);
          i = close + 1;
        }
      } else {
        value += ch;
        i++;
      }
    }
    i = Math.min(i, n);
    out.push({ type: 'word', raw: input.slice(start, i), value, start, end: i, ...(quoted && { quoted }) });
  }
  return out;
}

/** Position de la parenthèse/accolade fermante correspondant à `input[open]`, ou -1. */
function findClosing(input: string, open: number): number {
  const openCh = input[open];
  const closeCh = openCh === '(' ? ')' : '}';
  let depth = 0;
  for (let j = open; j < input.length; j++) {
    const ch = input[j];
    if (ch === '\\') {
      j++;
    } else if (ch === "'") {
      const close = input.indexOf("'", j + 1);
      if (close === -1) return -1;
      j = close;
    } else if (ch === openCh) {
      depth++;
    } else if (ch === closeCh && --depth === 0) {
      return j;
    }
  }
  return -1;
}

/* ------------------------------------------------------------------ */
/* Analyse : classe chaque mot selon sa position dans la commande      */
/* ------------------------------------------------------------------ */

/** Commandes qui en exécutent une autre : le premier mot libre après leurs options est une commande. */
const WRAPPERS = new Set(['sudo', 'nohup', 'time', 'nice', 'xargs', 'env', 'watch', 'exec', 'command', 'builtin', 'doas']);

/** Options à valeur connues pour les wrappers (le reste vient des fiches via `ParserSpec`). */
const DEFAULT_VALUE_OPTIONS: Record<string, string[]> = {
  sudo: ['-u', '-g', '-C', '-D', '-p', '--user', '--group'],
  doas: ['-u', '-C'],
  nice: ['-n', '--adjustment'],
  xargs: ['-n', '-I', '-d', '-P', '-L', '-a', '-E', '-s', '--max-args', '--delimiter', '--max-procs'],
  env: ['-u', '-C', '-S', '--unset', '--chdir'],
  watch: ['-n', '--interval'],
};

/** Commandes dont les options à un tiret sont des mots entiers (`find -name`, `ip -br`). */
const SINGLE_DASH_LONG = new Set(['find', 'ip', 'java', 'gcc', 'g++', 'clang', 'ffmpeg', 'xrandr']);

/** Commandes qui enchaînent plusieurs sous-commandes n'importe où (`parted /dev/sda mklabel gpt mkpart …`). */
const SUBCOMMANDS_ANYWHERE = new Set(['parted']);

const ASSIGNMENT_RE = /^[A-Za-z_][A-Za-z0-9_]*=/;
const NUMERIC_OPTION_RE = /^-\d+$/;
const SIGNAL_OPTION_RE = /^-(SIG)?[A-Z]{2,}\d*$/;
const SIGNAL_COMMANDS = new Set(['kill', 'killall', 'pkill']);
const CHMOD_DASH_MODE_RE = /^-[rwxXst]+$/;
const CONTINUES_AFTER: ReadonlySet<ControlOperator> = new Set(['|', '|&', '&&', '||']);

interface SegmentState {
  segment: Segment;
  owner: string | null;
  endOfOptions: boolean;
  pendingOption: Token | null;
  pendingRedirect: { redirect: Redirect; token: Token } | null;
  positional: number;
  chmodModeSeen: boolean;
}

function newState(): SegmentState {
  return {
    segment: { command: null, commands: [], tokens: [], redirects: [] },
    owner: null,
    endOfOptions: false,
    pendingOption: null,
    pendingRedirect: null,
    positional: 0,
    chmodModeSeen: false,
  };
}

export function parseCommandLine(input: string, spec: ParserSpec = {}): ParsedLine {
  const errors: ParseError[] = [];
  const lexemes = lex(input, errors);
  const segments: Segment[] = [];

  const takesValue = (command: string, option: string) =>
    spec.takesValue?.(command, option) ?? DEFAULT_VALUE_OPTIONS[command]?.includes(option) ?? false;

  let state = newState();
  let lastControl: { op: ControlOperator; start: number; end: number } | null = null;

  const closeSegment = () => {
    const { pendingRedirect, pendingOption } = state;
    if (pendingRedirect) {
      errors.push({
        message: tr(`Redirection « ${pendingRedirect.redirect.op} » sans cible`, `Redirection “${pendingRedirect.redirect.op}” has no target`),
        start: pendingRedirect.token.start,
        end: pendingRedirect.token.end,
      });
    }
    if (pendingOption) {
      errors.push({
        message: tr(`L'option ${pendingOption.value} attend une valeur`, `The option ${pendingOption.value} expects a value`),
        start: pendingOption.start,
        end: pendingOption.end,
      });
    }
  };

  const setCommand = (value: string) => {
    state.owner = value;
    state.endOfOptions = false;
    state.positional = 0;
    state.chmodModeSeen = false;
    state.segment.commands.push(value);
    state.segment.command ??= value;
  };

  for (const lx of lexemes) {
    const seg = state.segment;

    if (lx.type === 'comment') {
      seg.tokens.push({ kind: 'comment', raw: lx.raw, value: lx.raw, start: lx.start, end: lx.end });
      continue;
    }

    if (lx.type === 'control') {
      const token: Token = {
        kind: lx.op === '|' || lx.op === '|&' ? 'pipe' : 'chain',
        raw: lx.op,
        value: lx.op,
        start: lx.start,
        end: lx.end,
      };
      if (seg.tokens.length === 0) {
        errors.push({ message: tr(`Commande manquante avant « ${lx.op} »`, `Missing command before “${lx.op}”`), start: lx.start, end: lx.end });
      }
      closeSegment();
      seg.tokens.push(token);
      seg.next = lx.op;
      segments.push(seg);
      lastControl = lx;
      state = newState();
      continue;
    }

    if (lx.type === 'redirect') {
      const token: Token = { kind: 'redirect', raw: lx.raw, value: lx.raw, start: lx.start, end: lx.end };
      if (state.pendingRedirect) {
        const p = state.pendingRedirect;
        errors.push({ message: tr(`Redirection « ${p.redirect.op} » sans cible`, `Redirection “${p.redirect.op}” has no target`), start: p.token.start, end: p.token.end });
      }
      const redirect = { ...lx.redirect };
      seg.tokens.push(token);
      seg.redirects.push(redirect);
      state.pendingRedirect = lx.complete ? null : { redirect, token };
      continue;
    }

    // Mot
    const base = { raw: lx.raw, value: lx.value, start: lx.start, end: lx.end, ...(lx.quoted && { quoted: lx.quoted }) };
    const owner = state.owner;

    if (state.pendingRedirect) {
      state.pendingRedirect.redirect.target = lx.value;
      seg.tokens.push({ kind: 'redirect-target', ...base });
      state.pendingRedirect = null;
      continue;
    }

    if (state.pendingOption) {
      seg.tokens.push({ kind: 'option-value', ...base, command: state.pendingOption.command! });
      state.pendingOption = null;
      continue;
    }

    if (owner === null) {
      if (ASSIGNMENT_RE.test(lx.value)) {
        seg.tokens.push({ kind: 'assignment', ...base });
      } else {
        seg.tokens.push({ kind: 'command', ...base });
        setCommand(lx.value);
      }
      continue;
    }

    const isOptionLike = !state.endOfOptions && lx.value.length > 1 && lx.value.startsWith('-');

    // Wrapper (sudo, xargs…) : le premier mot libre est la commande exécutée
    if (WRAPPERS.has(owner) && !isOptionLike && state.positional === 0) {
      if (owner === 'env' && ASSIGNMENT_RE.test(lx.value)) {
        seg.tokens.push({ kind: 'assignment', ...base, command: owner });
      } else {
        seg.tokens.push({ kind: 'command', ...base });
        setCommand(lx.value);
      }
      continue;
    }

    // chmod : le premier argument est le mode (y compris `-x`, qui n'est pas une option de chmod)
    if (owner === 'chmod' && !state.chmodModeSeen && state.positional === 0) {
      const dashMode = isOptionLike && CHMOD_DASH_MODE_RE.test(lx.value);
      const notation = dashMode ? 'symbolic' : isOptionLike ? null : chmodNotation(lx.value);
      if (notation) {
        seg.tokens.push({ kind: 'chmod-mode', ...base, command: owner, chmodNotation: notation });
        state.chmodModeSeen = true;
        state.positional++;
        continue;
      }
    }

    if (isOptionLike) {
      seg.tokens.push(...optionTokens(lx, owner));
      continue;
    }

    if ((state.positional === 0 || SUBCOMMANDS_ANYWHERE.has(owner)) && spec.isSubcommand?.(owner, lx.value)) {
      seg.tokens.push({ kind: 'subcommand', ...base, command: owner });
    } else {
      seg.tokens.push({ kind: 'argument', ...base, command: owner });
    }
    state.positional++;
  }

  function optionTokens(lx: Extract<Lexeme, { type: 'word' }>, owner: string): Token[] {
    const { value, raw, start, end } = lx;
    const quoted = lx.quoted && { quoted: lx.quoted };

    if (value === '--') {
      state.endOfOptions = true;
      return [{ kind: 'option', raw, value, start, end, command: owner }];
    }

    // --long, --long=valeur
    if (value.startsWith('--')) {
      const eq = value.indexOf('=');
      const name = eq === -1 ? value : value.slice(0, eq);
      const token: Token = { kind: 'option', raw, value: name, start, end, command: owner, ...quoted };
      if (eq !== -1) token.inlineValue = value.slice(eq + 1);
      else if (takesValue(owner, name)) state.pendingOption = token;
      return [token];
    }

    // -9, -SIGKILL, find -name : option en un seul bloc
    if (
      SINGLE_DASH_LONG.has(owner) ||
      NUMERIC_OPTION_RE.test(value) ||
      (SIGNAL_COMMANDS.has(owner) && SIGNAL_OPTION_RE.test(value))
    ) {
      const token: Token = { kind: 'option', raw, value, start, end, command: owner, ...quoted };
      if (takesValue(owner, value)) state.pendingOption = token;
      return [token];
    }

    // Options courtes, éventuellement groupées : -la → -l, -a
    const letters = value.slice(1);
    const grouped = letters.length > 1;
    // Positions par caractère seulement si le mot n'a ni guillemets ni échappements
    const exact = raw === value;
    const tokens: Token[] = [];
    for (let k = 0; k < letters.length; k++) {
      const option = `-${letters[k]}`;
      const charStart = exact ? start + (k === 0 ? 0 : k + 1) : start;
      const charEnd = exact ? start + k + 2 : end;
      const token: Token = {
        kind: 'option',
        raw: exact ? raw.slice(charStart - start, charEnd - start) : raw,
        value: option,
        start: charStart,
        end: charEnd,
        command: owner,
        ...quoted,
        ...(grouped && { groupedFrom: value }),
      };
      tokens.push(token);
      if (takesValue(owner, option)) {
        const remainder = letters.slice(k + 1);
        if (remainder) {
          token.inlineValue = remainder;
          if (exact) {
            token.end = end;
            token.raw = raw.slice(charStart - start);
          }
        } else {
          state.pendingOption = token;
        }
        break;
      }
    }
    return tokens;
  }

  closeSegment();
  const last = state.segment;
  if (last.tokens.length > 0) {
    segments.push(last);
  } else if (lastControl && CONTINUES_AFTER.has(lastControl.op)) {
    errors.push({
      message: tr(`Commande manquante après « ${lastControl.op} »`, `Missing command after “${lastControl.op}”`),
      start: lastControl.start,
      end: lastControl.end,
    });
  }

  return { input, segments, errors };
}

/** Tous les tokens de la ligne, dans l'ordre, avec l'index de leur segment. */
export function flattenTokens(parsed: ParsedLine): Array<Token & { segmentIndex: number }> {
  return parsed.segments.flatMap((s, segmentIndex) => s.tokens.map((t) => ({ ...t, segmentIndex })));
}
