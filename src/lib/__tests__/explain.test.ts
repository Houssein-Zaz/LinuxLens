import { explainRedirect, explainToken } from '../explain';
import { parseCommandLine } from '../parser';
import { registrySpec } from '../registry';

function explainAll(input: string, ctx = {}) {
  const parsed = parseCommandLine(input, registrySpec);
  return parsed.segments.flatMap((s) => s.tokens.map((t) => ({ token: t, ex: explainToken(t, s, ctx) })));
}
const find = (input: string, raw: string) => {
  const hit = explainAll(input).find((e) => e.token.raw === raw || e.token.value === raw);
  if (!hit) throw new Error(`token ${raw} introuvable`);
  return hit.ex;
};

describe('explainToken', () => {
  it('commande connue : résumé de la fiche', () => {
    expect(find('ls -l', 'ls')).toMatchObject({ kindLabel: 'Commande', known: true, text: "Liste le contenu d'un répertoire." });
  });

  it('commande inconnue : message clair', () => {
    const ex = find('frobnicate --x', 'frobnicate');
    expect(ex.known).toBe(false);
    expect(ex.text).toMatch(/ne fait pas partie/);
  });

  it('commande sans fiche mais avec résumé tldr', () => {
    const [cmd] = explainAll('rsync -a a b', { summaryFor: (c: string) => (c === 'rsync' ? 'Synchronise des fichiers.' : undefined) });
    expect(cmd?.ex).toMatchObject({ known: true, text: 'Synchronise des fichiers.' });
  });

  it('option documentée, avec forme alternative et groupe', () => {
    const ex = explainAll('ls -la').find((e) => e.token.value === '-a')!.ex;
    expect(ex.known).toBe(true);
    expect(ex.detail).toMatch(/--all/);
    expect(ex.detail).toMatch(/groupe -la/);
  });

  it('option longue avec valeur collée', () => {
    const ex = find('ls --color=auto', '--color=auto');
    expect(ex.detail).toMatch(/auto/);
    expect(ex.detail).toMatch(/Valeurs possibles/);
  });

  it('option non documentée', () => {
    expect(find('ls -Z', '-Z').known).toBe(false);
  });

  it("valeur d'option", () => {
    expect(find('head -n 5 f', '5').text).toBe('Valeur « 5 » donnée à l’option -n (N).');
  });

  it('arguments associés aux positions de la fiche (cp SOURCE... DESTINATION)', () => {
    const all = explainAll('cp a b c dest/');
    const labels = all.filter((e) => e.token.kind === 'argument').map((e) => e.ex.kindLabel);
    expect(labels).toEqual(['Argument · SOURCE', 'Argument · SOURCE', 'Argument · SOURCE', 'Argument · DESTINATION']);
  });

  it('argument variadique seul (cp avec une seule valeur)', () => {
    expect(find('cp a', 'a').kindLabel).toBe('Argument · SOURCE');
  });

  it('grep MOTIF puis FICHIER', () => {
    const labels = explainAll('grep -i err a.log b.log').filter((e) => e.token.kind === 'argument').map((e) => e.ex.kindLabel);
    expect(labels).toEqual(['Argument · MOTIF', 'Argument · FICHIER', 'Argument · FICHIER']);
  });

  it('chmod octal et symbolique', () => {
    expect(find('chmod 750 f', '750').text).toBe('Notation octale : rwxr-x---.');
    expect(find('chmod go-w f', 'go-w').text).toBe("Retire l'écriture pour le groupe et les autres.");
    const labels = explainAll('chmod 755 f').map((e) => e.ex.kindLabel);
    expect(labels).toEqual(['Commande', 'Mode chmod', 'Argument · FICHIER']);
  });

  it('mots spéciaux : joker, variable, guillemets', () => {
    expect(find('rm *.tmp', '*.tmp').detail).toMatch(/joker/);
    expect(find('echo $HOME', '$HOME')).toMatchObject({ kindLabel: 'Argument · TEXTE', detail: expect.stringMatching(/variable/) });
    expect(find('frob $HOME', '$HOME').text).toMatch(/variable/);
    expect(find(`grep 'a b' f`, `'a b'`).detail).toMatch(/guillemets simples/);
  });

  it('opérateurs et redirections', () => {
    expect(find('ls | wc', '|').text).toMatch(/^Pipe/);
    expect(find('a && b', '&&').text).toMatch(/réussi/);
    expect(find('ls > out', '>').text).toMatch(/remplaçant/);
    expect(find('ls 2> /dev/null', '/dev/null').text).toMatch(/trou noir/);
  });

  it('valeurs collées aux options courtes (cut -d: -f1, awk -F:)', () => {
    const cut = explainAll('cut -d: -f1 /etc/passwd').filter((e) => e.token.kind === 'option');
    expect(cut.map((e) => [e.token.value, e.token.inlineValue, e.ex.known])).toEqual([
      ['-d', ':', true],
      ['-f', '1', true],
    ]);
    expect(find('awk -F: "{print $1}" f', '-F:').detail).toMatch(/Valeur : « : »/);
  });

  it('nohup enveloppe la commande qui suit', () => {
    const labels = explainAll('nohup python3 serveur.py &').map((e) => `${e.token.kind}:${e.token.value}`);
    expect(labels).toEqual(['command:nohup', 'command:python3', 'argument:serveur.py', 'chain:&']);
  });

  it('affectation', () => {
    expect(find('LANG=C sort f', 'LANG=C').text).toMatch(/LANG = « C »/);
  });
});

describe('explainRedirect', () => {
  it('décrit chaque type', () => {
    expect(explainRedirect({ op: '2>', kind: 'write', fd: 2, target: 'e' })).toMatch(/les erreurs/);
    expect(explainRedirect({ op: '>>', kind: 'append', fd: 1, target: 'f' })).toMatch(/à la fin/);
    expect(explainRedirect({ op: '2>&1', kind: 'duplicate', fd: 2, target: '1' })).toBe(
      'Les erreurs (stderr) vont au même endroit que la sortie standard (stdout).',
    );
  });
});

describe('sous-commandes enchaînées (parted)', () => {
  const input = 'sudo parted /dev/sdX -s mklabel gpt mkpart "boot" 0% 500MiB mkpart "system" 500MiB 100%';

  it('chaque mot a une explication documentée', () => {
    const all = explainAll(input);
    expect(all.map((e) => `${e.token.kind}:${e.token.value}`)).toEqual([
      'command:sudo',
      'command:parted',
      'argument:/dev/sdX',
      'option:-s',
      'subcommand:mklabel',
      'argument:gpt',
      'subcommand:mkpart',
      'argument:boot',
      'argument:0%',
      'argument:500MiB',
      'subcommand:mkpart',
      'argument:system',
      'argument:500MiB',
      'argument:100%',
    ]);
    expect(all.filter((e) => !e.ex.known).map((e) => e.token.value)).toEqual([]);
  });

  it('les arguments suivent les paramètres de leur sous-commande', () => {
    const labels = explainAll(input)
      .filter((e) => e.token.kind === 'argument')
      .map((e) => e.ex.kindLabel.replace('Argument · ', ''));
    expect(labels).toEqual(['DISQUE', 'TYPE-TABLE', 'NOM', 'DÉBUT', 'FIN', 'NOM', 'DÉBUT', 'FIN']);
  });
});
