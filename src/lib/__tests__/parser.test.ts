import { parseCommandLine } from '../parser';
import type { ParserSpec, Token } from '../../types/parser';

const kinds = (tokens: Token[]) => tokens.map((t) => `${t.kind}:${t.value}`);
const first = (input: string, spec?: ParserSpec) => {
  const parsed = parseCommandLine(input, spec);
  const seg = parsed.segments[0];
  if (!seg) throw new Error('aucun segment');
  return { parsed, seg };
};

const spec: ParserSpec = {
  takesValue: (cmd, opt) =>
    ({
      head: ['-n', '--lines'],
      tar: ['-f', '--file'],
      grep: ['-e', '-A'],
      find: ['-name', '-type'],
      ls: ['--color'],
    })[cmd]?.includes(opt),
  isSubcommand: (cmd, word) => cmd === 'apt' && ['install', 'update', 'remove'].includes(word),
};

describe('parseCommandLine — bases', () => {
  it('renvoie une liste vide pour une saisie vide ou blanche', () => {
    expect(parseCommandLine('').segments).toEqual([]);
    expect(parseCommandLine('   ').segments).toEqual([]);
  });

  it('identifie la commande et ses arguments', () => {
    const { seg } = first('cp source.txt dest/');
    expect(seg.command).toBe('cp');
    expect(kinds(seg.tokens)).toEqual(['command:cp', 'argument:source.txt', 'argument:dest/']);
    expect(seg.tokens[1]?.command).toBe('cp');
  });

  it('conserve des positions exactes', () => {
    const input = '  ls   -l  /tmp';
    const { seg } = first(input);
    for (const t of seg.tokens) expect(input.slice(t.start, t.end)).toBe(t.raw);
    expect(seg.tokens.map((t) => t.start)).toEqual([2, 7, 11]);
  });
});

describe('options', () => {
  it('option courte simple', () => {
    expect(kinds(first('ls -l').seg.tokens)).toEqual(['command:ls', 'option:-l']);
  });

  it('éclate les options groupées avec des positions par caractère', () => {
    const input = 'ls -la';
    const { seg } = first(input);
    expect(kinds(seg.tokens)).toEqual(['command:ls', 'option:-l', 'option:-a']);
    const [, l, a] = seg.tokens;
    expect(l).toMatchObject({ raw: '-l', start: 3, end: 5, groupedFrom: '-la' });
    expect(a).toMatchObject({ raw: 'a', start: 5, end: 6, groupedFrom: '-la' });
  });

  it("n'ajoute pas groupedFrom à une option seule", () => {
    expect(first('ls -l').seg.tokens[1]?.groupedFrom).toBeUndefined();
  });

  it('options longues avec et sans valeur', () => {
    const { seg } = first('ls --all --color=auto');
    expect(kinds(seg.tokens)).toEqual(['command:ls', 'option:--all', 'option:--color']);
    expect(seg.tokens[2]).toMatchObject({ raw: '--color=auto', inlineValue: 'auto' });
  });

  it("valeur d'option séparée selon la spec", () => {
    const { seg } = first('head -n 5 fichier.txt', spec);
    expect(kinds(seg.tokens)).toEqual(['command:head', 'option:-n', 'option-value:5', 'argument:fichier.txt']);
  });

  it('valeur collée à une option courte (-n5)', () => {
    const { seg } = first('head -n5 f', spec);
    expect(seg.tokens[1]).toMatchObject({ kind: 'option', value: '-n', inlineValue: '5' });
    expect(seg.tokens[2]?.kind).toBe('argument');
  });

  it("groupe se terminant par une option à valeur (tar -xzvf archive)", () => {
    const { seg } = first('tar -xzvf archive.tar.gz', spec);
    expect(kinds(seg.tokens)).toEqual([
      'command:tar',
      'option:-x',
      'option:-z',
      'option:-v',
      'option:-f',
      'option-value:archive.tar.gz',
    ]);
  });

  it('sans spec, un mot après une option reste un argument', () => {
    expect(kinds(first('head -n 5').seg.tokens)).toEqual(['command:head', 'option:-n', 'argument:5']);
  });

  it('options numériques et signaux (kill -9, kill -SIGTERM)', () => {
    expect(kinds(first('kill -9 1234').seg.tokens)).toEqual(['command:kill', 'option:-9', 'argument:1234']);
    expect(kinds(first('kill -SIGTERM 1234').seg.tokens)).toEqual([
      'command:kill',
      'option:-SIGTERM',
      'argument:1234',
    ]);
  });

  it('options longues à un tiret pour find', () => {
    const { seg } = first('find . -name "*.log" -type f -delete', spec);
    expect(kinds(seg.tokens)).toEqual([
      'command:find',
      'argument:.',
      'option:-name',
      'option-value:*.log',
      'option:-type',
      'option-value:f',
      'option:-delete',
    ]);
  });

  it('options en mots entiers pour ip (-br, -4)', () => {
    expect(kinds(first('ip -br -4 a').seg.tokens)).toEqual(['command:ip', 'option:-br', 'option:-4', 'argument:a']);
  });

  it('-- termine les options', () => {
    const { seg } = first('rm -- -fichier');
    expect(kinds(seg.tokens)).toEqual(['command:rm', 'option:--', 'argument:-fichier']);
  });

  it('- seul est un argument (entrée standard)', () => {
    expect(kinds(first('cat -').seg.tokens)).toEqual(['command:cat', 'argument:-']);
  });
});

describe('guillemets et échappements', () => {
  it('guillemets doubles', () => {
    const { seg } = first('grep "hello world" f.txt');
    expect(seg.tokens[1]).toMatchObject({
      kind: 'argument',
      raw: '"hello world"',
      value: 'hello world',
      quoted: 'double',
    });
  });

  it('guillemets simples : contenu littéral', () => {
    const { seg } = first(`echo '$HOME | "x"'`);
    expect(seg.tokens).toHaveLength(2);
    expect(seg.tokens[1]).toMatchObject({ value: '$HOME | "x"', quoted: 'single' });
  });

  it('échappements dans les guillemets doubles', () => {
    expect(first('echo "a \\"b\\" c"').seg.tokens[1]?.value).toBe('a "b" c');
  });

  it('antislash hors guillemets', () => {
    const { seg } = first('cat mon\\ fichier.txt');
    expect(kinds(seg.tokens)).toEqual(['command:cat', 'argument:mon fichier.txt']);
  });

  it('mot mêlant parties quotées et non quotées', () => {
    expect(first(`echo pre"fi"'xe'`).seg.tokens[1]?.value).toBe('prefixe');
  });

  it('signale un guillemet non fermé sans planter', () => {
    const parsed = parseCommandLine('echo "oups');
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]?.message).toMatch(/guillemet/i);
    expect(parsed.segments[0]?.tokens[1]?.value).toBe('oups');
  });

  it('ne coupe pas à l’intérieur de $(…) ni de `…`', () => {
    const { parsed, seg } = first('echo $(ls | wc -l) `date`');
    expect(parsed.segments).toHaveLength(1);
    expect(kinds(seg.tokens)).toEqual(['command:echo', 'argument:$(ls | wc -l)', 'argument:`date`']);
  });
});

describe('pipes et chaînage', () => {
  it('découpe un pipe en segments', () => {
    const { segments, errors } = parseCommandLine('ps aux | grep nginx | wc -l');
    expect(errors).toEqual([]);
    expect(segments.map((s) => s.command)).toEqual(['ps', 'grep', 'wc']);
    expect(segments.map((s) => s.next)).toEqual(['|', '|', undefined]);
    expect(segments[0]?.tokens.at(-1)).toMatchObject({ kind: 'pipe', value: '|' });
  });

  it('pipe sans espaces', () => {
    const { segments } = parseCommandLine('ls|wc');
    expect(segments.map((s) => s.command)).toEqual(['ls', 'wc']);
  });

  it('opérateurs &&, ||, ; et &', () => {
    const { segments } = parseCommandLine('mkdir d && cd d || echo ko; ls & pwd');
    expect(segments.map((s) => s.command)).toEqual(['mkdir', 'cd', 'echo', 'ls', 'pwd']);
    expect(segments.map((s) => s.next)).toEqual(['&&', '||', ';', '&', undefined]);
    expect(segments[0]?.tokens.at(-1)?.kind).toBe('chain');
  });

  it('un ; ou & final ne crée pas de segment vide', () => {
    expect(parseCommandLine('ls ;').segments).toHaveLength(1);
    expect(parseCommandLine('sleep 10 &').errors).toEqual([]);
  });

  it('signale une commande manquante après un pipe', () => {
    const { errors } = parseCommandLine('ls |');
    expect(errors[0]?.message).toMatch(/après « \| »/);
  });

  it('signale un opérateur en début de ligne', () => {
    expect(parseCommandLine('&& ls').errors[0]?.message).toMatch(/avant « && »/);
  });

  it('\\; de find -exec n’est pas un opérateur', () => {
    const { segments } = parseCommandLine('find . -exec rm {} \\;');
    expect(segments).toHaveLength(1);
    expect(segments[0]?.tokens.at(-1)).toMatchObject({ kind: 'argument', value: ';' });
  });
});

describe('redirections', () => {
  it('> et >>', () => {
    const { seg } = first('echo salut > out.txt');
    expect(kinds(seg.tokens)).toEqual(['command:echo', 'argument:salut', 'redirect:>', 'redirect-target:out.txt']);
    expect(seg.redirects).toEqual([{ op: '>', kind: 'write', fd: 1, target: 'out.txt' }]);
    expect(first('date >> log').seg.redirects[0]).toMatchObject({ kind: 'append', fd: 1 });
  });

  it('< et 2>', () => {
    const { seg } = first('sort < in.txt 2> err.log');
    expect(seg.redirects).toEqual([
      { op: '<', kind: 'read', fd: 0, target: 'in.txt' },
      { op: '2>', kind: 'write', fd: 2, target: 'err.log' },
    ]);
  });

  it('2>&1 et &>', () => {
    const { seg } = first('make > build.log 2>&1');
    expect(seg.redirects[1]).toEqual({ op: '2>&1', kind: 'duplicate', fd: 2, target: '1' });
    expect(first('cmd &> tout.log').seg.redirects[0]).toMatchObject({ kind: 'write-both', fd: null });
  });

  it('redirection collée (ls>out, cmd 2>/dev/null)', () => {
    expect(kinds(first('ls>out').seg.tokens)).toEqual(['command:ls', 'redirect:>', 'redirect-target:out']);
    expect(first('find / -name x 2>/dev/null').seg.redirects[0]).toMatchObject({ fd: 2, target: '/dev/null' });
  });

  it('un chiffre en fin de mot n’est pas un descripteur (file2>x)', () => {
    const { seg } = first('cat file2>x');
    expect(kinds(seg.tokens)).toEqual(['command:cat', 'argument:file2', 'redirect:>', 'redirect-target:x']);
  });

  it('redirection sans cible', () => {
    expect(parseCommandLine('ls >').errors[0]?.message).toMatch(/cible/);
  });

  it('redirection en tête de commande', () => {
    const { seg } = first('> vide.txt');
    expect(seg.command).toBeNull();
    expect(seg.redirects[0]?.target).toBe('vide.txt');
  });
});

describe('chmod', () => {
  it('notation octale', () => {
    const { seg } = first('chmod 755 script.sh');
    expect(seg.tokens[1]).toMatchObject({ kind: 'chmod-mode', value: '755', chmodNotation: 'octal' });
    expect(seg.tokens[2]?.kind).toBe('argument');
  });

  it('notation symbolique', () => {
    for (const mode of ['u+x', 'go-w', 'a=r', 'u=rwx,g=rx,o=', '+x', 'g+s']) {
      expect(first(`chmod ${mode} f`).seg.tokens[1]).toMatchObject({ kind: 'chmod-mode', chmodNotation: 'symbolic' });
    }
  });

  it('avec option -R avant le mode', () => {
    const { seg } = first('chmod -R 750 dossier/');
    expect(kinds(seg.tokens)).toEqual(['command:chmod', 'option:-R', 'chmod-mode:750', 'argument:dossier/']);
  });

  it('mode symbolique commençant par un tiret (chmod -x f)', () => {
    expect(first('chmod -x f').seg.tokens[1]).toMatchObject({ kind: 'chmod-mode', value: '-x' });
  });

  it("un seul mode : l'argument suivant reste un fichier", () => {
    expect(first('chmod 644 755').seg.tokens[2]?.kind).toBe('argument');
  });

  it('pas de mode chmod pour les autres commandes', () => {
    expect(first('echo 755').seg.tokens[1]?.kind).toBe('argument');
  });
});

describe('cas particuliers', () => {
  it('affectations avant la commande', () => {
    const { seg } = first('LANG=C sort f');
    expect(kinds(seg.tokens)).toEqual(['assignment:LANG=C', 'command:sort', 'argument:f']);
    expect(seg.command).toBe('sort');
  });

  it('sudo : la commande enveloppée est reconnue', () => {
    const { seg } = first('sudo -u root apt install nginx', spec);
    expect(seg.commands).toEqual(['sudo', 'apt']);
    expect(kinds(seg.tokens)).toEqual([
      'command:sudo',
      'option:-u',
      'option-value:root',
      'command:apt',
      'subcommand:install',
      'argument:nginx',
    ]);
    expect(seg.tokens[5]?.command).toBe('apt');
  });

  it('xargs avec options puis commande', () => {
    const { seg } = first('xargs -n 1 rm -f');
    expect(seg.commands).toEqual(['xargs', 'rm']);
    expect(seg.tokens.at(-1)).toMatchObject({ kind: 'option', value: '-f', command: 'rm' });
  });

  it('commentaire en fin de ligne', () => {
    const { seg } = first('ls # liste');
    expect(kinds(seg.tokens)).toEqual(['command:ls', 'comment:# liste']);
  });

  it("# au milieu d'un mot n'est pas un commentaire", () => {
    expect(first('echo a#b').seg.tokens[1]?.value).toBe('a#b');
  });

  it('signale une option attendant une valeur manquante', () => {
    expect(parseCommandLine('head -n', spec).errors[0]?.message).toMatch(/-n/);
  });
});
