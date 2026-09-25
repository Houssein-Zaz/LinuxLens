import { canonicalize, checkCommand, checkOctalAnswer, checkSymbolicAnswer } from '../exercise';

const same = (a: string, b: string) => expect(canonicalize(a).segments).toEqual(canonicalize(b).segments);
const differ = (a: string, b: string) => expect(canonicalize(a).segments).not.toEqual(canonicalize(b).segments);

describe('canonicalize : écritures équivalentes', () => {
  it('ordre et regroupement des options', () => {
    same('ls -la', 'ls -al');
    same('ls -la', 'ls -l -a');
    same('ls -la', 'ls --all -l');
    same('sort -nr f', 'sort -r -n f');
  });

  it('valeurs d’options collées ou séparées', () => {
    same('head -n 5 f', 'head -n5 f');
    same('head -n 5 f', 'head --lines 5 f');
    same('cut -d: -f1 /etc/passwd', "cut -d ':' -f 1 /etc/passwd");
    differ('head -n 5 f', 'head -n 6 f');
  });

  it('guillemets et chemins', () => {
    same('grep "error" app.log', 'grep error app.log');
    same('cp -r projet/ sauvegarde', 'cp -r ./projet sauvegarde/');
    differ('ls /', 'ls');
  });

  it('modes chmod absolus : octal = symbolique', () => {
    same('chmod 755 f', 'chmod u=rwx,go=rx f');
    same('chmod 755 f', 'chmod 0755 f');
    same('chmod 600 f', 'chmod u=rw,g=,o= f');
    // u+x dépend des droits de départ : il n'équivaut à aucun octal
    differ('chmod u+x f', 'chmod 744 f');
  });

  it("l'ordre des arguments compte", () => {
    differ('cp a b', 'cp b a');
  });

  it('pipes, redirections et opérateurs', () => {
    same('ps aux | grep nginx', 'ps aux|grep "nginx"');
    differ('echo a > f', 'echo a >> f');
    differ('a && b', 'a ; b');
  });
});

describe('checkCommand', () => {
  it('accepte une réponse équivalente', () => {
    expect(checkCommand('ls -al', ['ls -la'])).toEqual({ ok: true, matched: 'ls -la' });
  });

  it('accepte une solution alternative', () => {
    expect(checkCommand('sort noms.txt | uniq', ['sort -u noms.txt', 'sort noms.txt | uniq']).ok).toBe(true);
  });

  it('tolère les options ignorées', () => {
    expect(checkCommand('tar -czvf a.tar.gz d', ['tar -czf a.tar.gz d'], ['-v']).ok).toBe(true);
    expect(checkCommand('tar -czvf a.tar.gz d', ['tar -czf a.tar.gz d']).ok).toBe(false);
  });

  const messages = (input: string, solutions: string[]) => {
    const r = checkCommand(input, solutions);
    if (r.ok) throw new Error('réponse acceptée à tort');
    return r.messages;
  };

  it('mauvaise commande', () => {
    expect(messages('cat app.log', ['tail -n 20 app.log'])).toEqual(['« cat » n’est pas la commande attendue.']);
  });

  it('option manquante, sans dévoiler laquelle', () => {
    expect(messages('ls -l', ['ls -la'])).toEqual(['Il manque une option.']);
  });

  it('option en trop', () => {
    expect(messages('ls -laR', ['ls -la'])).toEqual(['L’option -R n’est pas nécessaire ici.']);
  });

  it('mauvaise valeur d’option', () => {
    expect(messages('tail -n 10 app.log', ['tail -n 20 app.log'])).toEqual(['La valeur donnée à -n n’est pas la bonne.']);
  });

  it('arguments', () => {
    expect(messages('mv final.txt brouillon.txt', ['mv brouillon.txt final.txt'])).toEqual([
      'Vérifiez les arguments (noms de fichiers, motif, mode…).',
    ]);
    expect(messages('wc -l', ['wc -l data.csv'])[0]).toMatch(/attend 1 argument, vous en avez donné 0/);
  });

  it('nombre de commandes', () => {
    expect(messages('ps aux', ['ps aux | grep nginx'])[0]).toMatch(/enchaîne 2 commandes/);
  });

  it('redirection', () => {
    expect(messages('echo fin > journal.txt', ['echo fin >> journal.txt'])).toEqual(['Vérifiez la redirection.']);
  });

  it('précise la commande concernée dans un pipe', () => {
    expect(messages('ps aux | grep -i nginx', ['ps aux | grep nginx'])).toEqual([
      'L’option -i n’est pas nécessaire ici (commande 2).',
    ]);
  });

  it('erreurs de syntaxe et réponse vide', () => {
    expect(messages('echo "oups', ['echo oups'])[0]).toMatch(/Guillemet/);
    expect(messages('  ', ['ls'])).toEqual(['Tapez une commande.']);
  });
});

describe('conversions de permissions', () => {
  it('octal', () => {
    expect(checkOctalAnswer('750', 'rwxr-x---')).toBe(true);
    expect(checkOctalAnswer(' 0750 ', 'rwxr-x---')).toBe(true);
    expect(checkOctalAnswer('755', 'rwxr-x---')).toBe(false);
    expect(checkOctalAnswer('abc', 'rwxr-x---')).toBe(false);
  });

  it('symbolique, avec ou sans caractère de type', () => {
    expect(checkSymbolicAnswer('rw-r-----', '640')).toBe(true);
    expect(checkSymbolicAnswer('-rw-r-----', '640')).toBe(true);
    expect(checkSymbolicAnswer('rw-r--r--', '640')).toBe(false);
  });
});
