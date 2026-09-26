import { exampleFor } from '../examples';
import { explainSegment } from '../explain';
import { parseCommandLine } from '../parser';
import { registrySpec } from '../registry';

function exampleOf(input: string, raw: string) {
  const parsed = parseCommandLine(input, registrySpec);
  for (const seg of parsed.segments) {
    const token = seg.tokens.find((t) => t.raw === raw || t.value === raw);
    if (token) return exampleFor(token, seg);
  }
  throw new Error(`token ${raw} introuvable`);
}

describe('exemples concrets', () => {
  it('option avec exemple dédié dans la fiche', () => {
    expect(exampleOf('ls -A', '-A')).toEqual({ command: 'ls -A', output: '.bashrc  .config  Documents  projets' });
  });

  it('option illustrée par un exemple de la fiche, avec sa sortie de préférence', () => {
    const ex = exampleOf('ls -la', '-l');
    expect(ex?.command).toBe('ls -l');
    expect(ex?.output).toMatch(/fichier1/);
    expect(ex?.caption).toBeTruthy();
  });

  it('option longue ou courte : même exemple', () => {
    expect(exampleOf('grep --ignore-case x f', '--ignore-case')).toEqual(exampleOf('grep -i x f', '-i'));
  });

  it('valeur d’option : pas d’exemple répété (celui de l’option est juste au-dessus)', () => {
    expect(exampleOf('head -n 5 f', '5')).toBeUndefined();
    expect(exampleOf('head -n 5 f', '-n')).toBeDefined();
  });

  it('pas deux fois le même exemple dans un segment ; la commande en prend un autre', () => {
    const [seg] = parseCommandLine('grep -rn TODO src', registrySpec).segments;
    const shown = explainSegment(seg!).map((e) => e.example?.command);
    const defined = shown.filter(Boolean);
    expect(new Set(defined).size).toBe(defined.length);
    expect(shown[0]).toBeDefined(); // grep
    expect(shown[1]).toBe('grep -rn "TODO" src/'); // -r
    expect(shown[0]).not.toBe(shown[1]);
  });

  it('script exécuté par son chemin', () => {
    const [seg] = parseCommandLine('./deploy.sh --prod', registrySpec).segments;
    const [cmd] = explainSegment(seg!);
    expect(cmd).toMatchObject({ known: true, text: expect.stringMatching(/répertoire courant/) });
    expect(cmd?.example?.command).toMatch(/\.\/bonjour\.sh/);
  });

  it('commande et sous-commande', () => {
    expect(exampleOf('tar -xf a.tar', 'tar')?.command).toMatch(/^tar /);
    expect(exampleOf('sudo apt install htop', 'install')?.command).toMatch(/apt install/);
  });

  it('mode chmod : résultat calculé sur le fichier de la commande', () => {
    expect(exampleOf('chmod 750 deploy.sh', '750')).toMatchObject({
      command: 'chmod 750 deploy.sh ; ls -l deploy.sh',
      output: expect.stringMatching(/^-rwxr-x--- .* deploy\.sh$/),
    });
    expect(exampleOf('chmod u+x script.sh', 'u+x')).toMatchObject({
      output: expect.stringMatching(/^-rwxr--r--/),
      caption: expect.stringMatching(/Avant : -rw-r--r--/),
    });
  });

  it('redirections : chaque type a sa démonstration', () => {
    expect(exampleOf('ls > f', '>')?.command).toMatch(/> salut\.txt/);
    expect(exampleOf('ls >> f', '>>')?.output).toBe('ligne 1\nligne 2');
    expect(exampleOf('ls 2> f', '2>')?.command).toMatch(/2> erreurs\.txt/);
    expect(exampleOf('make > f 2>&1', '2>&1')?.command).toMatch(/2>&1/);
  });

  it('opérateurs', () => {
    expect(exampleOf('ls | wc', '|')?.command).toBe('ls | wc -l');
    expect(exampleOf('a && b', '&&')?.caption).toMatch(/n’est pas affiché/);
    expect(exampleOf('a || b', '||')?.output).toMatch(/échec$/);
  });

  it('mots spéciaux', () => {
    expect(exampleOf('rm *.tmp', '*.tmp')?.command).toBe('ls *.txt');
    expect(exampleOf('echo $HOME', '$HOME')?.output).toBe('Mon dossier : /home/esprit');
    expect(exampleOf('find / 2> /dev/null', '/dev/null')?.caption).toMatch(/disparaissent/);
    expect(exampleOf('ls fichier.txt', 'fichier.txt')).toBeUndefined();
  });

  it('les commandes des exemples génériques sont valides', () => {
    for (const input of ['ls > f', 'ls >> f', 'ls 2> f', 'sort < f', 'make > f 2>&1', 'ls &> f', 'ls | wc', 'a && b', 'a || b', 'a ; b', 'a &', 'echo $HOME', 'rm *.tmp', 'LANG=C sort']) {
      const parsed = parseCommandLine(input, registrySpec);
      for (const seg of parsed.segments)
        for (const t of seg.tokens) {
          const ex = exampleFor(t, seg);
          if (ex) expect(parseCommandLine(ex.command, registrySpec).errors, ex.command).toEqual([]);
        }
    }
  });
});
