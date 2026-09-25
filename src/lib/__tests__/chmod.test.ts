import { chmodNotation, isOctalMode, isSymbolicMode } from '../chmod';

describe('détection des modes chmod', () => {
  it.each(['755', '644', '0755', '4755', '000'])('%s est octal', (m) => expect(isOctalMode(m)).toBe(true));
  it.each(['75', '888', '12345', 'abc'])("%s n'est pas octal", (m) => expect(isOctalMode(m)).toBe(false));

  it.each(['u+x', 'go-w', 'a=r', '+x', 'u=rwx,g=rx,o=', 'g+s', 'o+t', 'u+X', 'g=u', 'ug+rw-x'])(
    '%s est symbolique',
    (m) => expect(isSymbolicMode(m)).toBe(true),
  );
  it.each(['u', 'x+u', 'u+z', 'fichier.txt', '', 'u+x,'])("%s n'est pas symbolique", (m) =>
    expect(isSymbolicMode(m)).toBe(false),
  );

  it('chmodNotation', () => {
    expect(chmodNotation('750')).toBe('octal');
    expect(chmodNotation('u+x')).toBe('symbolic');
    expect(chmodNotation('script.sh')).toBeNull();
  });
});
