import type { CommandDoc } from '../types/command';
import type { ControlOperator, Redirect, RedirectKind, Segment, Token } from '../types/parser';
import { applyChmod, fromOctal, toOctal, toSymbolic } from './permissions';
import { parseCommandLine } from './parser';
import { findOption, getCommand, registrySpec } from './registry';
import { getLang, tr, type Lang } from '../i18n';

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

// Une fiche par langue : le cache suit l'objet de la fiche
const parsedExamples = new WeakMap<CommandDoc, Array<{ example: CommandDoc['examples'][number]; tokens: Token[] }>>();

function examplesOf(doc: CommandDoc) {
  let list = parsedExamples.get(doc);
  if (!list) {
    list = doc.examples.map((example) => ({
      example,
      tokens: parseCommandLine(example.command, registrySpec).segments.flatMap((s) => s.tokens),
    }));
    parsedExamples.set(doc, list);
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

interface Demos {
  redirect: Record<RedirectKind, ConcreteExample>;
  stderr: ConcreteExample;
  control: Record<ControlOperator, ConcreteExample>;
  script: ConcreteExample;
  assignment: ConcreteExample;
}

const NO_SUCH_FILE_FR = "ls: impossible d'accéder à '/inexistant': Aucun fichier ou dossier de ce type";
const NO_SUCH_FILE_EN = "ls: cannot access '/nonexistent': No such file or directory";

const DEMOS: Record<Lang, Demos> = {
  fr: {
    redirect: {
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
        output: `${NO_SUCH_FILE_FR}\n/etc/hostname`,
        caption: 'Sans 2>&1, le message d’erreur serait resté à l’écran et seul /etc/hostname serait dans le fichier.',
      },
      'write-both': {
        command: 'ls /etc/hostname /inexistant &> tout.txt ; cat tout.txt',
        output: `${NO_SUCH_FILE_FR}\n/etc/hostname`,
        caption: 'Rien ne s’affiche pendant ls : sortie et erreurs vont toutes deux dans tout.txt.',
      },
      'append-both': {
        command: 'ls /inexistant &>> journal.txt',
        caption: 'Le message d’erreur est ajouté à la fin de journal.txt, sans effacer ce qu’il contient.',
      },
    },
    stderr: {
      command: 'ls /inexistant 2> erreurs.txt ; cat erreurs.txt',
      output: NO_SUCH_FILE_FR,
      caption: 'Rien ne s’affiche pendant ls : le message d’erreur est allé dans erreurs.txt.',
    },
    control: {
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
      '&': { command: 'sleep 30 &', output: '[1] 4521', caption: 'Le shell affiche le numéro de tâche et le PID, puis rend la main aussitôt.' },
    },
    script: {
      command: 'chmod +x bonjour.sh ; ./bonjour.sh',
      output: 'Bonjour !',
      caption: 'Sans « ./ », le shell chercherait bonjour.sh dans le PATH et répondrait « commande introuvable ».',
    },
    assignment: {
      command: 'LANG=C date',
      output: 'Fri Jul 12 21:14:05 CEST 2024',
      caption: 'Seule cette commande voit LANG=C : date s’affiche en anglais, le reste du shell reste en français.',
    },
  },
  en: {
    redirect: {
      write: {
        command: 'echo "Hello" > hello.txt ; cat hello.txt',
        output: 'Hello',
        caption: 'Running echo "Hi" > hello.txt again would replace “Hello”: the previous contents are lost.',
      },
      append: {
        command: 'echo "line 1" > notes.txt ; echo "line 2" >> notes.txt ; cat notes.txt',
        output: 'line 1\nline 2',
        caption: 'The second line is added after the first one.',
      },
      read: {
        command: 'sort < names.txt',
        output: 'Ali\nSara\nYanis',
        caption: 'names.txt contains “Sara”, “Ali”, “Yanis”: sort reads it as if it were typed on the keyboard.',
      },
      heredoc: {
        command: 'cat << END',
        output: 'Hello\neveryone',
        caption: 'After the command, you type “Hello”, “everyone”, then END: the lines are sent to cat.',
      },
      herestring: { command: 'wc -w <<< "one two three"', output: '3', caption: 'The string is sent to wc as if it came from a file.' },
      duplicate: {
        command: 'ls /etc/hostname /nonexistent > all.txt 2>&1 ; cat all.txt',
        output: `${NO_SUCH_FILE_EN}\n/etc/hostname`,
        caption: 'Without 2>&1, the error message would have stayed on screen and only /etc/hostname would be in the file.',
      },
      'write-both': {
        command: 'ls /etc/hostname /nonexistent &> all.txt ; cat all.txt',
        output: `${NO_SUCH_FILE_EN}\n/etc/hostname`,
        caption: 'Nothing is shown while ls runs: output and errors both go to all.txt.',
      },
      'append-both': {
        command: 'ls /nonexistent &>> log.txt',
        caption: 'The error message is added to the end of log.txt, without erasing what it contains.',
      },
    },
    stderr: {
      command: 'ls /nonexistent 2> errors.txt ; cat errors.txt',
      output: NO_SUCH_FILE_EN,
      caption: 'Nothing is shown while ls runs: the error message went to errors.txt.',
    },
    control: {
      '|': { command: 'ls | wc -l', output: '12', caption: 'ls produces 12 lines; instead of being displayed, they are counted by wc -l.' },
      '|&': { command: 'make |& grep -i error', caption: 'grep also receives the error messages from make, not just its normal output.' },
      '&&': {
        command: 'mkdir test && echo "folder created"',
        output: 'folder created',
        caption: 'Run a second time, mkdir fails (the folder exists): the message is not displayed.',
      },
      '||': {
        command: 'cd /nonexistent || echo "failed"',
        output: 'bash: cd: /nonexistent: No such file or directory\nfailed',
        caption: 'echo runs only because cd failed.',
      },
      ';': {
        command: 'cd /nonexistent ; pwd',
        output: 'bash: cd: /nonexistent: No such file or directory\n/home/esprit',
        caption: 'pwd runs anyway, even though cd failed.',
      },
      '&': { command: 'sleep 30 &', output: '[1] 4521', caption: 'The shell prints the job number and the PID, then gives the prompt back right away.' },
    },
    script: {
      command: 'chmod +x hello.sh ; ./hello.sh',
      output: 'Hello!',
      caption: 'Without “./”, the shell would look for hello.sh in the PATH and answer “command not found”.',
    },
    assignment: {
      command: 'LANG=fr_FR.UTF-8 date',
      output: 'ven. 12 juil. 2024 21:14:05 CEST',
      caption: 'Only this command sees LANG=fr_FR.UTF-8: date is shown in French, the rest of the shell stays in English.',
    },
  },
};

const demos = () => DEMOS[getLang()];

function redirectExample(r: Redirect): ConcreteExample {
  return r.kind === 'write' && r.fd === 2 ? demos().stderr : demos().redirect[r.kind];
}

function wordExample(token: Token): ConcreteExample | undefined {
  const v = token.value;
  if (v === '-') {
    return { command: `echo "${tr('texte', 'text')}" | cat -`, output: tr('texte', 'text'), caption: tr('cat lit l’entrée standard, ici la sortie d’echo.', 'cat reads standard input, here the output of echo.') };
  }
  if (v === '/dev/null') {
    return {
      command: 'find / -name "*.conf" 2> /dev/null',
      caption: tr(
        'Les milliers de « Permission non accordée » disparaissent ; seuls les résultats s’affichent.',
        'The thousands of “Permission denied” messages disappear; only the results are shown.',
      ),
    };
  }
  if (v === '~' || v.startsWith('~/')) return { command: 'echo ~/Documents', output: '/home/esprit/Documents' };
  if (/^\$\(.*\)$|^`.*`$/s.test(v)) {
    return getLang() === 'fr'
      ? { command: 'echo "Nous sommes le $(date +%A)"', output: 'Nous sommes le vendredi' }
      : { command: 'echo "Today is $(date +%A)"', output: 'Today is Friday' };
  }
  if (token.quoted !== 'single' && /\$[A-Za-z_{]/.test(v)) {
    return getLang() === 'fr'
      ? { command: 'echo "Mon dossier : $HOME"', output: 'Mon dossier : /home/esprit', caption: "Avec des guillemets simples, echo '$HOME' afficherait $HOME tel quel." }
      : { command: 'echo "My folder: $HOME"', output: 'My folder: /home/esprit', caption: "With single quotes, echo '$HOME' would print $HOME literally." };
  }
  if (!token.quoted && /[*?[]/.test(v)) {
    return {
      command: 'ls *.txt',
      output: 'notes.txt  todo.txt',
      caption: tr(
        'Dans un dossier contenant notes.txt, todo.txt et photo.jpg : le shell remplace *.txt par « notes.txt todo.txt » avant de lancer ls.',
        'In a folder containing notes.txt, todo.txt and photo.jpg: the shell replaces *.txt with “notes.txt todo.txt” before running ls.',
      ),
    };
  }
  if (token.quoted === 'single') {
    return getLang() === 'fr'
      ? { command: "echo 'Prix : $5'", output: 'Prix : $5', caption: 'Sans guillemets simples, $5 serait remplacé (par rien).' }
      : { command: "echo 'Price: $5'", output: 'Price: $5', caption: 'Without single quotes, $5 would be replaced (with nothing).' };
  }
  if (token.quoted === 'double') {
    return {
      command: 'echo "a     b"',
      output: 'a     b',
      caption: tr(
        'Sans guillemets, echo a     b afficherait « a b » : les espaces multiples sont perdus.',
        'Without quotes, echo a     b would print “a b”: the extra spaces are lost.',
      ),
    };
  }
  return undefined;
}

function chmodExample(token: Token, segment: Segment): ConcreteExample | undefined {
  const file =
    segment.tokens.find((t) => t.kind === 'argument' && t.command === 'chmod' && t.start > token.start)?.value ?? tr('fichier', 'file');
  const before = fromOctal('644')!;
  const after = applyChmod(before, token.value);
  if (!after) return undefined;
  const date = tr('juil. 12 21:14', 'Jul 12 21:14');
  const line = (p: typeof before) => `-${toSymbolic(p)} 1 esprit esprit 1024 ${date} ${file}`;
  const absolute = fromOctal(token.value) !== null;
  return {
    command: `chmod ${token.value} ${file} ; ls -l ${file}`,
    output: line(after),
    caption: absolute
      ? tr(
          `Quels que soient les droits de départ, ${file} passe en ${toSymbolic(after)} (${toOctal(after)}).`,
          `Whatever the starting permissions, ${file} becomes ${toSymbolic(after)} (${toOctal(after)}).`,
        )
      : tr(
          `Avant : ${line(before)} (644). Le mode symbolique ne modifie que les droits indiqués.`,
          `Before: ${line(before)} (644). A symbolic mode only changes the permissions it names.`,
        ),
  };
}

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
      if (token.value.includes('/')) return demos().script;
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
      return demos().control[token.value as ControlOperator];
    case 'assignment':
      return demos().assignment;
    case 'comment':
      return undefined;
  }
}
