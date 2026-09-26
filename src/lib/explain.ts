import type { ControlOperator, Redirect, Segment, Token, TokenKind } from '../types/parser';
import type { CommandArgument } from '../types/command';
import { findOption, getCommand } from './registry';
import { describePermissions, describeSymbolicMode, fromOctal, toSymbolic } from './permissions';
import { exampleFor, type ConcreteExample } from './examples';

export const KIND_LABEL: Record<TokenKind, string> = {
  command: 'Commande',
  subcommand: 'Sous-commande',
  option: 'Option',
  'option-value': "Valeur d'option",
  argument: 'Argument',
  'chmod-mode': 'Mode chmod',
  assignment: 'Variable',
  pipe: 'Pipe',
  chain: 'Enchaînement',
  redirect: 'Redirection',
  'redirect-target': 'Cible de redirection',
  comment: 'Commentaire',
};

export interface Explanation {
  kindLabel: string;
  /** Texte principal, en français. */
  text: string;
  /** Précision secondaire (valeurs possibles, groupe d'origine…). */
  detail?: string;
  /** `false` si LinuxLens ne sait rien de cet élément. */
  known: boolean;
  /** Exemple concret : commande, sortie et contexte. */
  example?: ConcreteExample;
}

export interface ExplainContext {
  /** Résumé venant d'une autre source (tldr-pages) pour une commande sans fiche détaillée. */
  summaryFor?(command: string): string | undefined;
}

const FD_LABEL: Record<number, string> = {
  0: "l'entrée standard (stdin)",
  1: 'la sortie standard (stdout)',
  2: 'les erreurs (stderr)',
};
const fdLabel = (fd: number | null) => (fd === null ? 'la sortie et les erreurs' : (FD_LABEL[fd] ?? `le descripteur ${fd}`));

export function explainRedirect(r: Redirect): string {
  const what = fdLabel(r.fd);
  const capital = what.charAt(0).toUpperCase() + what.slice(1);
  switch (r.kind) {
    case 'write':
      return `Écrit ${what} dans un fichier, en remplaçant son contenu (le fichier est créé s'il n'existe pas).`;
    case 'append':
      return `Ajoute ${what} à la fin d'un fichier, sans effacer son contenu.`;
    case 'read':
      return "Lit l'entrée standard depuis un fichier au lieu du clavier.";
    case 'heredoc':
      return "Here-doc : les lignes suivantes, jusqu'au délimiteur, servent d'entrée standard.";
    case 'herestring':
      return "Here-string : la chaîne qui suit est passée comme entrée standard.";
    case 'duplicate':
      return `${capital} ${r.fd === 2 ? 'vont' : 'va'} au même endroit que ${fdLabel(Number(r.target))}.`;
    case 'write-both':
      return 'Écrit la sortie standard et les erreurs dans un même fichier, en remplaçant son contenu.';
    case 'append-both':
      return "Ajoute la sortie standard et les erreurs à la fin d'un fichier.";
  }
}

export const CONTROL_TEXT: Record<ControlOperator, string> = {
  '|': "Pipe : la sortie de la commande de gauche devient l'entrée de la commande de droite.",
  '|&': "Pipe étendu : la sortie et les erreurs de gauche deviennent l'entrée de droite.",
  '&&': 'ET logique : la commande suivante ne s’exécute que si la précédente a réussi (code de retour 0).',
  '||': 'OU logique : la commande suivante ne s’exécute que si la précédente a échoué.',
  ';': 'Séparateur : exécute les commandes l’une après l’autre, quel que soit le résultat.',
  '&': 'Arrière-plan : lance la commande sans attendre sa fin ; le shell rend la main immédiatement.',
};

/** Associe chaque argument positionnel à sa description dans la fiche (`cp SOURCE... DESTINATION`). */
function argumentSpecFor(specs: CommandArgument[], index: number, total: number): CommandArgument | undefined {
  if (specs.length === 0) return undefined;
  const variadicAt = specs.findIndex((a) => a.variadic);
  if (variadicAt === -1) return specs[Math.min(index, specs.length - 1)];
  const after = specs.length - variadicAt - 1;
  if (index < variadicAt) return specs[index];
  // Les arguments après le variadique prennent les dernières positions, s'il y en a assez
  const fromEnd = total - 1 - index;
  if (fromEnd < after && total > variadicAt + after) return specs[specs.length - 1 - fromEnd];
  return specs[variadicAt];
}

function describeWord(token: Token): string | undefined {
  const v = token.value;
  if (v === '-') return 'Un tiret seul désigne en général l’entrée standard.';
  if (v === '/dev/null') return 'Le « trou noir » : tout ce qui y est écrit est jeté.';
  if (v === '~' || v.startsWith('~/')) return '« ~ » est remplacé par le chemin du répertoire personnel.';
  if (/^\$\(.*\)$|^`.*`$/s.test(v)) return 'Substitution de commande : remplacée par la sortie de la commande entre parenthèses.';
  if (token.quoted !== 'single' && /\$[A-Za-z_{]/.test(v)) return 'Contient une variable, remplacée par sa valeur avant l’exécution.';
  if (!token.quoted && /[*?[]/.test(v)) return 'Motif (joker) : le shell le remplace par la liste des fichiers correspondants.';
  if (token.quoted === 'single') return 'Entre guillemets simples : le texte est pris tel quel, sans aucune interprétation.';
  if (token.quoted === 'double') return 'Entre guillemets doubles : les espaces sont conservés, les variables ($VAR) sont développées.';
  return undefined;
}

export function explainToken(token: Token, segment: Segment, ctx: ExplainContext = {}): Explanation {
  return describeToken(token, segment, ctx);
}

/**
 * Explique tous les tokens d'un segment, avec un exemple concret différent pour chacun :
 * les éléments précis (options, redirections…) choisissent d'abord, puis la commande
 * prend un exemple qui n'est pas déjà affiché.
 */
export function explainSegment(segment: Segment, ctx: ExplainContext = {}): Explanation[] {
  const explanations = segment.tokens.map((t) => describeToken(t, segment, ctx));
  const isCommand = (i: number) => Number(segment.tokens[i]!.kind === 'command');
  const order = segment.tokens.map((_, i) => i).sort((a, b) => isCommand(a) - isCommand(b));
  const shown = new Set<string>();
  for (const i of order) {
    const example = exampleFor(segment.tokens[i]!, segment, shown);
    if (example) {
      shown.add(example.command);
      explanations[i] = { ...explanations[i]!, example };
    }
  }
  return explanations;
}

/** Commande donnée par un chemin : ./script.sh, /usr/bin/python3, ~/bin/outil. */
export const isPathCommand = (name: string) => name.includes('/');

function describeToken(token: Token, segment: Segment, ctx: ExplainContext): Explanation {
  const kindLabel = KIND_LABEL[token.kind];
  const doc = token.command ? getCommand(token.command) : undefined;

  switch (token.kind) {
    case 'command': {
      const cmd = getCommand(token.value);
      if (cmd) return { kindLabel, text: cmd.summary, known: true };
      if (isPathCommand(token.value)) {
        return {
          kindLabel,
          text: token.value.startsWith('./')
            ? `Exécute le programme ou script « ${token.value.slice(2)} » situé dans le répertoire courant.`
            : 'Exécute le programme situé à ce chemin précis, au lieu de le chercher dans le PATH.',
          detail: 'Le fichier doit avoir le droit d’exécution (chmod +x). Un script commence en général par une ligne #! qui indique son interpréteur, par exemple #!/bin/bash.',
          known: true,
        };
      }
      const other = ctx.summaryFor?.(token.value);
      if (other) return { kindLabel, text: other, known: true };
      return {
        kindLabel,
        text: `« ${token.value} » ne fait pas partie des commandes connues de LinuxLens.`,
        detail: 'Le découpage reste valable : les mots qui suivent sont ses options et arguments.',
        known: false,
      };
    }

    case 'option': {
      const opt = doc && findOption(doc, token.value);
      const fromGroup = token.groupedFrom ? `Extraite du groupe ${token.groupedFrom}.` : undefined;
      const inline = token.inlineValue !== undefined ? `Valeur : « ${token.inlineValue} ».` : undefined;
      if (token.value === '--') {
        return { kindLabel, text: 'Fin des options : tout ce qui suit est un argument, même s’il commence par un tiret.', known: true };
      }
      if (!opt) {
        return {
          kindLabel,
          text: doc
            ? `Option ${token.value} non documentée dans la fiche de ${doc.name}.`
            : `Option ${token.value} de ${token.command ?? 'la commande'}.`,
          detail: [fromGroup, inline].filter(Boolean).join(' ') || undefined,
          known: false,
        };
      }
      const other = token.value === opt.short ? opt.long : opt.short;
      const detail = [
        other && `Forme ${token.value === opt.short ? 'longue' : 'courte'} : ${other}.`,
        fromGroup,
        inline,
        opt.values && `Valeurs possibles : ${opt.values.join(', ')}.`,
      ].filter(Boolean);
      return { kindLabel, text: opt.description, known: true, ...(detail.length && { detail: detail.join(' ') }) };
    }

    case 'option-value': {
      const index = segment.tokens.indexOf(token);
      const option = segment.tokens.slice(0, index).findLast((t) => t.kind === 'option');
      const opt = doc && option && findOption(doc, option.value);
      return {
        kindLabel,
        text: `Valeur « ${token.value} » donnée à l’option ${option?.value ?? ''}${opt?.valueName ? ` (${opt.valueName})` : ''}.`,
        ...(opt && { detail: opt.description }),
        known: Boolean(opt),
      };
    }

    case 'chmod-mode': {
      if (token.chmodNotation === 'octal') {
        const p = fromOctal(token.value)!;
        return {
          kindLabel,
          text: `Notation octale : ${toSymbolic(p)}.`,
          detail: `${describePermissions(p)}. Chaque chiffre additionne lecture (4), écriture (2) et exécution (1).`,
          known: true,
        };
      }
      return {
        kindLabel,
        text: describeSymbolicMode(token.value) ?? `Mode symbolique ${token.value}.`,
        detail: 'u = propriétaire, g = groupe, o = autres, a = tous ; + ajoute, - retire, = fixe exactement.',
        known: true,
      };
    }

    case 'subcommand': {
      const sub = doc?.subcommands?.find((s) => s.name === token.value);
      return { kindLabel, text: sub?.description ?? `Sous-commande de ${token.command}.`, known: Boolean(sub) };
    }

    case 'argument': {
      const positional = segment.tokens.filter(
        (t) => t.command === token.command && (t.kind === 'argument' || t.kind === 'subcommand' || t.kind === 'chmod-mode'),
      );
      const index = positional.indexOf(token);
      // Argument d'une sous-commande qui décrit les siens : `mkpart NOM DÉBUT FIN`
      const subAt = positional.slice(0, index).findLastIndex((t) => t.kind === 'subcommand');
      const sub = subAt === -1 ? undefined : doc?.subcommands?.find((s) => s.name === positional[subAt]!.value);
      let spec: CommandArgument | undefined;
      if (sub?.arguments) {
        const nextSub = positional.findIndex((t, i) => i > subAt && t.kind === 'subcommand');
        const own = positional.slice(subAt + 1, nextSub === -1 ? undefined : nextSub);
        spec = argumentSpecFor(sub.arguments, own.indexOf(token), own.length);
      } else if (doc) {
        spec = argumentSpecFor(doc.arguments ?? [], index, positional.length);
      }
      const word = describeWord(token);
      if (spec) {
        return { kindLabel: `${kindLabel} · ${spec.name}`, text: spec.description, known: true, ...(word && { detail: word }) };
      }
      return {
        kindLabel,
        text: word ?? `Argument passé à ${token.command ?? 'la commande'} : fichier, texte ou valeur selon la commande.`,
        known: Boolean(word),
      };
    }

    case 'assignment': {
      const [name, ...rest] = token.value.split('=');
      return {
        kindLabel,
        text: `Définit la variable d’environnement ${name} = « ${rest.join('=')} » pour cette commande uniquement.`,
        known: true,
      };
    }

    case 'redirect': {
      const redirect = segment.redirects[segment.tokens.filter((t) => t.kind === 'redirect').indexOf(token)];
      return { kindLabel, text: redirect ? explainRedirect(redirect) : 'Redirection.', known: true };
    }

    case 'redirect-target':
      return {
        kindLabel,
        text: describeWord(token) ?? `Fichier « ${token.value} » utilisé par la redirection.`,
        known: true,
      };

    case 'pipe':
    case 'chain':
      return { kindLabel, text: CONTROL_TEXT[token.value as ControlOperator], known: true };

    case 'comment':
      return { kindLabel, text: 'Commentaire : ignoré par le shell.', known: true };
  }
}
