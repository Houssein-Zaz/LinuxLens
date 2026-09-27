import type { ControlOperator, Redirect, Segment, Token, TokenKind } from '../types/parser';
import type { CommandArgument } from '../types/command';
import { findOption, getCommand } from './registry';
import { describePermissions, describeSymbolicMode, fromOctal, toSymbolic } from './permissions';
import { exampleFor, type ConcreteExample } from './examples';
import { labels, tr } from '../i18n';

export const KIND_LABEL: Record<TokenKind, string> = labels({
  command: ['Commande', 'Command'],
  subcommand: ['Sous-commande', 'Subcommand'],
  option: ['Option', 'Option'],
  'option-value': ["Valeur d'option", 'Option value'],
  argument: ['Argument', 'Argument'],
  'chmod-mode': ['Mode chmod', 'chmod mode'],
  assignment: ['Variable', 'Variable'],
  pipe: ['Pipe', 'Pipe'],
  chain: ['Enchaînement', 'Chaining'],
  redirect: ['Redirection', 'Redirection'],
  'redirect-target': ['Cible de redirection', 'Redirection target'],
  comment: ['Commentaire', 'Comment'],
});

export interface Explanation {
  kindLabel: string;
  /** Texte principal, dans la langue courante. */
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

const FD_LABEL: Record<number, string> = labels({
  0: ["l'entrée standard (stdin)", 'standard input (stdin)'],
  1: ['la sortie standard (stdout)', 'standard output (stdout)'],
  2: ['les erreurs (stderr)', 'errors (stderr)'],
});
const fdLabel = (fd: number | null) =>
  fd === null ? tr('la sortie et les erreurs', 'output and errors') : (FD_LABEL[fd] ?? tr(`le descripteur ${fd}`, `file descriptor ${fd}`));

export function explainRedirect(r: Redirect): string {
  const what = fdLabel(r.fd);
  const capital = what.charAt(0).toUpperCase() + what.slice(1);
  switch (r.kind) {
    case 'write':
      return tr(
        `Écrit ${what} dans un fichier, en remplaçant son contenu (le fichier est créé s'il n'existe pas).`,
        `Writes ${what} to a file, replacing its contents (the file is created if it does not exist).`,
      );
    case 'append':
      return tr(`Ajoute ${what} à la fin d'un fichier, sans effacer son contenu.`, `Appends ${what} to the end of a file, without erasing its contents.`);
    case 'read':
      return tr("Lit l'entrée standard depuis un fichier au lieu du clavier.", 'Reads standard input from a file instead of the keyboard.');
    case 'heredoc':
      return tr(
        "Here-doc : les lignes suivantes, jusqu'au délimiteur, servent d'entrée standard.",
        'Here-doc: the following lines, up to the delimiter, are used as standard input.',
      );
    case 'herestring':
      return tr('Here-string : la chaîne qui suit est passée comme entrée standard.', 'Here-string: the string that follows is passed as standard input.');
    case 'duplicate':
      return tr(
        `${capital} ${r.fd === 2 ? 'vont' : 'va'} au même endroit que ${fdLabel(Number(r.target))}.`,
        `${capital} ${r.fd === 2 ? 'go' : 'goes'} to the same place as ${fdLabel(Number(r.target))}.`,
      );
    case 'write-both':
      return tr(
        'Écrit la sortie standard et les erreurs dans un même fichier, en remplaçant son contenu.',
        'Writes standard output and errors to the same file, replacing its contents.',
      );
    case 'append-both':
      return tr("Ajoute la sortie standard et les erreurs à la fin d'un fichier.", 'Appends standard output and errors to the end of a file.');
  }
}

export const CONTROL_TEXT: Record<ControlOperator, string> = labels({
  '|': [
    "Pipe : la sortie de la commande de gauche devient l'entrée de la commande de droite.",
    'Pipe: the output of the command on the left becomes the input of the command on the right.',
  ],
  '|&': [
    "Pipe étendu : la sortie et les erreurs de gauche deviennent l'entrée de droite.",
    'Extended pipe: the output and errors on the left become the input on the right.',
  ],
  '&&': [
    'ET logique : la commande suivante ne s’exécute que si la précédente a réussi (code de retour 0).',
    'Logical AND: the next command runs only if the previous one succeeded (exit code 0).',
  ],
  '||': ['OU logique : la commande suivante ne s’exécute que si la précédente a échoué.', 'Logical OR: the next command runs only if the previous one failed.'],
  ';': [
    'Séparateur : exécute les commandes l’une après l’autre, quel que soit le résultat.',
    'Separator: runs the commands one after the other, whatever the result.',
  ],
  '&': [
    'Arrière-plan : lance la commande sans attendre sa fin ; le shell rend la main immédiatement.',
    'Background: starts the command without waiting for it to finish; the shell gives the prompt back immediately.',
  ],
});

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
  if (v === '-') return tr('Un tiret seul désigne en général l’entrée standard.', 'A lone dash usually means standard input.');
  if (v === '/dev/null') return tr('Le « trou noir » : tout ce qui y est écrit est jeté.', 'The “black hole”: anything written to it is discarded.');
  if (v === '~' || v.startsWith('~/')) return tr('« ~ » est remplacé par le chemin du répertoire personnel.', '“~” is replaced by the path of your home directory.');
  if (/^\$\(.*\)$|^`.*`$/s.test(v)) {
    return tr(
      'Substitution de commande : remplacée par la sortie de la commande entre parenthèses.',
      'Command substitution: replaced by the output of the command in parentheses.',
    );
  }
  if (token.quoted !== 'single' && /\$[A-Za-z_{]/.test(v)) {
    return tr('Contient une variable, remplacée par sa valeur avant l’exécution.', 'Contains a variable, replaced by its value before the command runs.');
  }
  if (!token.quoted && /[*?[]/.test(v)) {
    return tr(
      'Motif (joker) : le shell le remplace par la liste des fichiers correspondants.',
      'Pattern (wildcard): the shell replaces it with the list of matching files.',
    );
  }
  if (token.quoted === 'single') {
    return tr('Entre guillemets simples : le texte est pris tel quel, sans aucune interprétation.', 'In single quotes: the text is taken literally, with no interpretation.');
  }
  if (token.quoted === 'double') {
    return tr(
      'Entre guillemets doubles : les espaces sont conservés, les variables ($VAR) sont développées.',
      'In double quotes: spaces are kept and variables ($VAR) are expanded.',
    );
  }
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
  const theCommand = tr('la commande', 'the command');

  switch (token.kind) {
    case 'command': {
      const cmd = getCommand(token.value);
      if (cmd) return { kindLabel, text: cmd.summary, known: true };
      if (isPathCommand(token.value)) {
        return {
          kindLabel,
          text: token.value.startsWith('./')
            ? tr(
                `Exécute le programme ou script « ${token.value.slice(2)} » situé dans le répertoire courant.`,
                `Runs the program or script “${token.value.slice(2)}” located in the current directory.`,
              )
            : tr(
                'Exécute le programme situé à ce chemin précis, au lieu de le chercher dans le PATH.',
                'Runs the program at this exact path, instead of looking it up in the PATH.',
              ),
          detail: tr(
            'Le fichier doit avoir le droit d’exécution (chmod +x). Un script commence en général par une ligne #! qui indique son interpréteur, par exemple #!/bin/bash.',
            'The file needs the execute permission (chmod +x). A script usually starts with a #! line naming its interpreter, for example #!/bin/bash.',
          ),
          known: true,
        };
      }
      const other = ctx.summaryFor?.(token.value);
      if (other) return { kindLabel, text: other, known: true };
      return {
        kindLabel,
        text: tr(`« ${token.value} » ne fait pas partie des commandes connues de LinuxLens.`, `“${token.value}” is not one of the commands LinuxLens knows.`),
        detail: tr(
          'Le découpage reste valable : les mots qui suivent sont ses options et arguments.',
          'The breakdown is still valid: the words that follow are its options and arguments.',
        ),
        known: false,
      };
    }

    case 'option': {
      const opt = doc && findOption(doc, token.value);
      const fromGroup = token.groupedFrom ? tr(`Extraite du groupe ${token.groupedFrom}.`, `Taken from the group ${token.groupedFrom}.`) : undefined;
      const inline = token.inlineValue !== undefined ? tr(`Valeur : « ${token.inlineValue} ».`, `Value: “${token.inlineValue}”.`) : undefined;
      if (token.value === '--') {
        return {
          kindLabel,
          text: tr(
            'Fin des options : tout ce qui suit est un argument, même s’il commence par un tiret.',
            'End of options: everything that follows is an argument, even if it starts with a dash.',
          ),
          known: true,
        };
      }
      if (!opt) {
        return {
          kindLabel,
          text: doc
            ? tr(`Option ${token.value} non documentée dans la fiche de ${doc.name}.`, `Option ${token.value} is not documented on the ${doc.name} page.`)
            : tr(`Option ${token.value} de ${token.command ?? theCommand}.`, `Option ${token.value} of ${token.command ?? theCommand}.`),
          detail: [fromGroup, inline].filter(Boolean).join(' ') || undefined,
          known: false,
        };
      }
      const other = token.value === opt.short ? opt.long : opt.short;
      const detail = [
        other &&
          (token.value === opt.short ? tr(`Forme longue : ${other}.`, `Long form: ${other}.`) : tr(`Forme courte : ${other}.`, `Short form: ${other}.`)),
        fromGroup,
        inline,
        opt.values && tr(`Valeurs possibles : ${opt.values.join(', ')}.`, `Possible values: ${opt.values.join(', ')}.`),
      ].filter(Boolean);
      return { kindLabel, text: opt.description, known: true, ...(detail.length && { detail: detail.join(' ') }) };
    }

    case 'option-value': {
      const index = segment.tokens.indexOf(token);
      const option = segment.tokens.slice(0, index).findLast((t) => t.kind === 'option');
      const opt = doc && option && findOption(doc, option.value);
      const name = opt?.valueName ? ` (${opt.valueName})` : '';
      return {
        kindLabel,
        text: tr(
          `Valeur « ${token.value} » donnée à l’option ${option?.value ?? ''}${name}.`,
          `Value “${token.value}” given to the option ${option?.value ?? ''}${name}.`,
        ),
        ...(opt && { detail: opt.description }),
        known: Boolean(opt),
      };
    }

    case 'chmod-mode': {
      if (token.chmodNotation === 'octal') {
        const p = fromOctal(token.value)!;
        return {
          kindLabel,
          text: tr(`Notation octale : ${toSymbolic(p)}.`, `Octal notation: ${toSymbolic(p)}.`),
          detail: tr(
            `${describePermissions(p)}. Chaque chiffre additionne lecture (4), écriture (2) et exécution (1).`,
            `${describePermissions(p)}. Each digit adds up read (4), write (2) and execute (1).`,
          ),
          known: true,
        };
      }
      return {
        kindLabel,
        text: describeSymbolicMode(token.value) ?? tr(`Mode symbolique ${token.value}.`, `Symbolic mode ${token.value}.`),
        detail: tr(
          'u = propriétaire, g = groupe, o = autres, a = tous ; + ajoute, - retire, = fixe exactement.',
          'u = owner, g = group, o = others, a = all; + adds, - removes, = sets exactly.',
        ),
        known: true,
      };
    }

    case 'subcommand': {
      const sub = doc?.subcommands?.find((s) => s.name === token.value);
      return {
        kindLabel,
        text: sub?.description ?? tr(`Sous-commande de ${token.command}.`, `Subcommand of ${token.command}.`),
        known: Boolean(sub),
      };
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
        text:
          word ??
          tr(
            `Argument passé à ${token.command ?? theCommand} : fichier, texte ou valeur selon la commande.`,
            `Argument passed to ${token.command ?? theCommand}: a file, text or value depending on the command.`,
          ),
        known: Boolean(word),
      };
    }

    case 'assignment': {
      const [name, ...rest] = token.value.split('=');
      return {
        kindLabel,
        text: tr(
          `Définit la variable d’environnement ${name} = « ${rest.join('=')} » pour cette commande uniquement.`,
          `Sets the environment variable ${name} = “${rest.join('=')}” for this command only.`,
        ),
        known: true,
      };
    }

    case 'redirect': {
      const redirect = segment.redirects[segment.tokens.filter((t) => t.kind === 'redirect').indexOf(token)];
      return { kindLabel, text: redirect ? explainRedirect(redirect) : tr('Redirection.', 'Redirection.'), known: true };
    }

    case 'redirect-target':
      return {
        kindLabel,
        text: describeWord(token) ?? tr(`Fichier « ${token.value} » utilisé par la redirection.`, `File “${token.value}” used by the redirection.`),
        known: true,
      };

    case 'pipe':
    case 'chain':
      return { kindLabel, text: CONTROL_TEXT[token.value as ControlOperator], known: true };

    case 'comment':
      return { kindLabel, text: tr('Commentaire : ignoré par le shell.', 'Comment: ignored by the shell.'), known: true };
  }
}
