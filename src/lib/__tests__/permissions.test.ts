import {
  applyChmod,
  describePermissions,
  describeSymbolicMode,
  fromOctal,
  fromSymbolic,
  toChmodSymbolic,
  toOctal,
  toSymbolic,
} from '../permissions';

describe('conversions octal ↔ symbolique', () => {
  it.each([
    ['755', 'rwxr-xr-x'],
    ['644', 'rw-r--r--'],
    ['750', 'rwxr-x---'],
    ['664', 'rw-rw-r--'],
    ['600', 'rw-------'],
    ['000', '---------'],
    ['777', 'rwxrwxrwx'],
    ['4755', 'rwsr-xr-x'],
    ['2750', 'rwxr-s---'],
    ['1777', 'rwxrwxrwt'],
    ['4644', 'rwSr--r--'],
    ['1776', 'rwxrwxrwT'],
  ])('%s ↔ %s', (octal, symbolic) => {
    expect(toSymbolic(fromOctal(octal)!)).toBe(symbolic);
    expect(toOctal(fromSymbolic(symbolic)!)).toBe(octal);
  });

  it('0755 est normalisé en 755', () => {
    expect(toOctal(fromOctal('0755')!)).toBe('755');
  });

  it('rejette les entrées invalides', () => {
    expect(fromOctal('789')).toBeNull();
    expect(fromOctal('75')).toBeNull();
    expect(fromSymbolic('rwxr-xr-')).toBeNull();
    expect(fromSymbolic('rwxr-xr-s')).toBeNull();
  });

  it('notation symbolique explicite pour chmod', () => {
    expect(toChmodSymbolic(fromOctal('750')!)).toBe('u=rwx,g=rx,o=');
  });

  it('décrit les permissions en français', () => {
    expect(describePermissions(fromOctal('640')!)).toBe(
      'propriétaire : lecture, écriture ; groupe : lecture ; autres : aucun droit',
    );
    expect(describePermissions(fromOctal('1777')!)).toMatch(/sticky bit/);
  });
});

describe('modes symboliques de chmod', () => {
  const base = fromOctal('644')!;
  const apply = (mode: string, from = base, dir = false) => toSymbolic(applyChmod(from, mode, dir)!);

  it.each([
    ['u+x', 'rwxr--r--'],
    ['go-r', 'rw-------'],
    ['a+x', 'rwxr-xr-x'],
    ['+x', 'rwxr-xr-x'],
    ['o=', 'rw-r-----'],
    ['u=rwx,g=rx,o=', 'rwxr-x---'],
    ['g=u', 'rw-rw-r--'],
    ['ug+w-r', '-w--w-r--'],
    ['u+s', 'rwSr--r--'],
    ['+t', 'rw-r--r-T'],
  ])('644 puis %s → %s', (mode, expected) => {
    expect(apply(mode)).toBe(expected);
  });

  it('X ne met x que sur les répertoires ou fichiers déjà exécutables', () => {
    expect(apply('a+X')).toBe('rw-r--r--');
    expect(apply('a+X', base, true)).toBe('rwxr-xr-x');
    expect(apply('g+X', fromOctal('744')!)).toBe('rwxr-xr--');
  });

  it('un mode octal remplace tout', () => {
    expect(apply('750')).toBe('rwxr-x---');
  });

  it('mode invalide', () => {
    expect(applyChmod(base, 'z+q')).toBeNull();
  });

  it('explications en français', () => {
    expect(describeSymbolicMode('u+x')).toBe("Ajoute l'exécution pour le propriétaire.");
    expect(describeSymbolicMode('go-w')).toBe("Retire l'écriture pour le groupe et les autres.");
    expect(describeSymbolicMode('a=r')).toBe('Donne exactement la lecture à tout le monde.');
    expect(describeSymbolicMode('o=')).toBe('Retire tous les droits aux autres.');
    expect(describeSymbolicMode('u+rw,g-x')).toBe(
      "Ajoute la lecture et l'écriture pour le propriétaire, puis retire l'exécution pour le groupe.",
    );
    expect(describeSymbolicMode('nope')).toBeNull();
  });
});
