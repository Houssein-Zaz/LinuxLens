import type { CommandDoc } from '../types/command';
import type { ControlOperator, Redirect, RedirectKind, Segment, Token } from '../types/parser';
import { applyChmod, fromOctal, toOctal, toSymbolic } from './permissions';
import { parseCommandLine } from './parser';
import { findOption, getCommand, registrySpec } from './registry';

/** Exemple concret affiché sous une explication. */
export interface ConcreteExample {
  command: string;
  output?: string;
  /** Contexte ou remarque : « Dans un dossier contenant… », « Avant : … ». */
  caption?: string;
}

/* ------------------------------------------------------------------ */
/* Exemples tirés des fiches                                           */
/* ------------------------------------------------------------------ */

const parsedExamples = new Map<string, Array<{ example: CommandDoc['examples'][number]; tokens: Token[] }>>();

function examplesOf(doc: CommandDoc) {
  let list = parsedExamples.get(doc.name);
  if (!list) {
    list = doc.examples.map((example) => ({
      example,
      tokens: parseCommandLine(example.command, registrySpec).segments.flatMap((s) => s.tokens),
    }));
    parsedExamples.set(doc.name, list);
  }
  return list;
}

const fromDocExample = (e: CommandDoc['examples'][number]): ConcreteExample => ({
  command: e.command,
  ...(e.output && { output: e.output }),
  caption: e.explanation,
});

/** Exemples d'abord avec sortie, plus parlants. */
const withOutputFirst = (list: CommandDoc['examples']) => [...list.filter((e) => e.output), ...list.filter((e) => !e.output)];

/** Exemples possibles d'une option : celui de la fiche, puis ceux de la commande qui l'utilisent. */
function optionCandidates(doc: CommandDoc, flag: string): ConcreteExample[] {
  const opt = findOption(doc, flag);
  if (!opt) return [];
  const same = (t: Token) => t.kind === 'option' && t.command === doc.name && findOption(doc, t.value) === opt;
  const hits = withOutputFirst(examplesOf(doc).filter(({ tokens }) => tokens.some(same)).map((h) => h.example));
  return [...(opt.example ? [{ ...opt.example }] : []), ...hits.map(fromDocExample)];
}

export function optionExample(doc: CommandDoc, flag: string): ConcreteExample | undefined {
  return optionCandidates(doc, flag)[0];
}

function subcommandCandidates(doc: CommandDoc, name: string): ConcreteExample[] {
  const hits = examplesOf(doc).filter(({ tokens }) => tokens.some((t) => t.kind === 'subcommand' && t.value === name));
  return withOutputFirst(hits.map((h) => h.example)).map(fromDocExample);
}

/* ------------------------------------------------------------------ */
/* Démonstrations génériques                                           */
/* ------------------------------------------------------------------ */

const NO_SUCH_FILE = "ls: impossible d'accéder à '/inexistant': Aucun fichier ou dossier de ce type";

const REDIRECT_EXAMPLES: Record<RedirectKind, ConcreteExample> = {
  write: {
    command: 'echo "Bonjour" > salut.txt ; cat salut.txt',
    output: 'Bonjour',
    caption: 'Relancer echo "Salut" > salut.txt remplacerait « Bonjour » : le contenu précédent est perdu.',
  },
  append: {
    command: 'echo "ligne 1" > notes.txt ; echo "ligne 2" >> notes.txt ; cat notes.txt',
    output: 'ligne 1\nligne 2',
    caption: 'La deuxième ligne s’ajoute à la suite de la première.',
  },
  read: {
    command: 'sort < noms.txt',
    output: 'Ali\nSara\nYanis',
    caption: 'noms.txt contient « Sara », « Ali », « Yanis » : sort le lit comme s’il était tapé au clavier.',
  },
  heredoc: {
    command: 'cat << FIN',
    output: 'Bonjour\nà tous',
    caption: 'Après la commande, on tape « Bonjour », « à tous », puis FIN : les lignes sont envoyées à cat.',
  },
  herestring: { command: 'wc -w <<< "un deux trois"', output: '3', caption: 'La chaîne est envoyée à wc comme si elle venait d’un fichier.' },
  duplicate: {
    command: 'ls /etc/hostname /inexistant > tout.txt 2>&1 ; cat tout.txt',
    output: `${NO_SUCH_FILE}\n/etc/hostname`,
    caption: 'Sans 2>&1, le message d’erreur serait resté à l’écran et seul /etc/hostname serait dans le fichier.',
  },
  'write-both': {
    command: 'ls /etc/hostname /inexistant &> tout.txt ; cat tout.txt',
    output: `${NO_SUCH_FILE}\n/etc/hostname`,
    caption: 'Rien ne s’affiche pendant ls : sortie et erreurs vont toutes deux dans tout.txt.',
  },
  'append-both': {
    command: 'ls /inexistant &>> journal.txt',
    caption: 'Le message d’erreur est ajouté à la fin de journal.txt, sans effacer ce qu’il contient.',
  },
};

function redirectExample(r: Redirect): ConcreteExample {
  if (r.kind === 'write' && r.fd === 2) {
    return {
      command: 'ls /inexistant 2> erreurs.txt ; cat erreurs.txt',
      output: NO_SUCH_FILE,
      caption: 'Rien ne s’affiche pendant ls : le message d’erreur est allé dans erreurs.txt.',
    };
  }
  return REDIRECT_EXAMPLES[r.kind];
}

const CONTROL_EXAMPLES: Record<ControlOperator, ConcreteExample> = {
  '|': { command: 'ls | wc -l', output: '12', caption: 'ls produit 12 lignes ; au lieu de s’afficher, elles sont comptées par wc -l.' },
  '|&': { command: 'make |& grep -i error', caption: 'grep reçoit aussi les messages d’erreur de make, pas seulement sa sortie normale.' },
  '&&': {
    command: 'mkdir test && echo "dossier créé"',
    output: 'dossier créé',
    caption: 'Relancée une 2ᵉ fois, mkdir échoue (le dossier existe) : le message n’est pas affiché.',
  },
  '||': {
    command: 'cd /inexistant || echo "échec"',
    output: 'bash: cd: /inexistant: Aucun fichier ou dossier de ce type\néchec',
    caption: 'echo ne s’exécute que parce que cd a échoué.',
  },
  ';': {
    command: 'cd /inexistant ; pwd',
    output: 'bash: cd: /inexistant: Aucun fichier ou dossier de ce type\n/home/esprit',
    caption: 'pwd s’exécute quand même, malgré l’échec de cd.',
  },
  '&': {
    command: 'sleep 30 &',
    output: '[1] 4521',
    caption: 'Le shell affiche le numéro de tâche et le PID, puis rend la main aussitôt.',
  },
};

function wordExample(token: Token): ConcreteExample | undefined {
  const v = token.value;
  if (v === '-') return { command: 'echo "texte" | cat -', output: 'texte', caption: 'cat lit l’entrée standard, ici la sortie d’echo.' };
  if (v === '/dev/null') {
    return { command: 'find / -name "*.conf" 2> /dev/null', caption: 'Les milliers de « Permission non accordée » disparaissent ; seuls les résultats s’affichent.' };
  }
  if (v === '~' || v.startsWith('~/')) return { command: 'echo ~/Documents', output: '/home/esprit/Documents' };
  if (/^\$\(.*\)$|^`.*`$/s.test(v)) return { command: 'echo "Nous sommes le $(date +%A)"', output: 'Nous sommes le vendredi' };
  if (token.quoted !== 'single' && /\$[A-Za-z_{]/.test(v)) {
    return { command: 'echo "Mon dossier : $HOME"', output: 'Mon dossier : /home/esprit', caption: "Avec des guillemets simples, echo '$HOME' afficherait $HOME tel quel." };
  }
  if (!token.quoted && /[*?[]/.test(v)) {
    return {
      command: 'ls *.txt',
      output: 'notes.txt  todo.txt',
      caption: 'Dans un dossier contenant notes.txt, todo.txt et photo.jpg : le shell remplace *.txt par « notes.txt todo.txt » avant de lancer ls.',
    };
  }
  if (token.quoted === 'single') return { command: "echo 'Prix : $5'", output: 'Prix : $5', caption: 'Sans guillemets simples, $5 serait remplacé (par rien).' };
  if (token.quoted === 'double') {
    return { command: 'echo "a     b"', output: 'a     b', caption: 'Sans guillemets, echo a     b afficherait « a b » : les espaces multiples sont perdus.' };
  }
  return undefined;
}

function chmodExample(token: Token, segment: Segment): ConcreteExample | undefined {
  const file =
    segment.tokens.find((t) => t.kind === 'argument' && t.command === 'chmod' && t.start > token.start)?.value ?? 'fichier';
  const before = fromOctal('644')!;
  const after = applyChmod(before, token.value);
  if (!after) return undefined;
  const line = (p: typeof before) => `-${toSymbolic(p)} 1 esprit esprit 1024 juil. 12 21:14 ${file}`;
  const absolute = fromOctal(token.value) !== null;
  return {
    command: `chmod ${token.value} ${file} ; ls -l ${file}`,
    output: line(after),
    caption: absolute
      ? `Quels que soient les droits de départ, ${file} passe en ${toSymbolic(after)} (${toOctal(after)}).`
      : `Avant : ${line(before)} (644). Le mode symbolique ne modifie que les droits indiqués.`,
  };
}

const SCRIPT_EXAMPLE: ConcreteExample = {
  command: 'chmod +x bonjour.sh ; ./bonjour.sh',
  output: 'Bonjour !',
  caption: 'Sans « ./ », le shell chercherait bonjour.sh dans le PATH et répondrait « commande introuvable ».',
};

/* ------------------------------------------------------------------ */

/**
 * Exemple concret pour un token, s'il en existe un.
 * `exclude` : commandes d'exemples déjà affichées, pour ne pas montrer deux fois le même.
 */
export function exampleFor(token: Token, segment: Segment, exclude: ReadonlySet<string> = new Set()): ConcreteExample | undefined {
  const doc = token.command ? getCommand(token.command) : undefined;
  const pick = (candidates: ConcreteExample[]) => candidates.find((c) => !exclude.has(c.command));
  switch (token.kind) {
    case 'command': {
      if (token.value.includes('/')) return SCRIPT_EXAMPLE;
      const own = getCommand(token.value);
      return own && pick(withOutputFirst(own.examples).map(fromDocExample));
    }
    case 'option':
      return doc && token.value !== '--' ? pick(optionCandidates(doc, token.value)) : undefined;
    case 'option-value':
      // la valeur est illustrée par l'exemple de son option, affiché juste au-dessus
      return undefined;
    case 'subcommand':
      return doc && pick(subcommandCandidates(doc, token.value));
    case 'chmod-mode':
      return chmodExample(token, segment);
    case 'argument':
    case 'redirect-target':
      return wordExample(token);
    case 'redirect': {
      const index = segment.tokens.filter((t) => t.kind === 'redirect').indexOf(token);
      const r = segment.redirects[index];
      return r && redirectExample(r);
    }
    case 'pipe':
    case 'chain':
      return CONTROL_EXAMPLES[token.value as ControlOperator];
    case 'assignment':
      return { command: 'LANG=C date', output: 'Fri Jul 12 21:14:05 CEST 2024', caption: 'Seule cette commande voit LANG=C : date s’affiche en anglais, le reste du shell reste en français.' };
    case 'comment':
      return undefined;
  }
}
