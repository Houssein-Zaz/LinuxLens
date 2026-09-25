import { matchScore, normalize } from '../search';

describe('recherche', () => {
  it('ignore accents et casse', () => {
    expect(normalize('Répertoire')).toBe('repertoire');
    expect(matchScore('REPERTOIRE', 'mkdir', 'Crée des répertoires.')).toBeGreaterThan(0);
  });

  it('classe nom exact > préfixe > inclusion > résumé', () => {
    const exact = matchScore('ls', 'ls');
    const prefix = matchScore('ls', 'lsblk');
    const inside = matchScore('ls', 'false');
    const summary = matchScore('liste', 'ls', 'Liste le contenu');
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(summary);
  });

  it('exige tous les mots', () => {
    expect(matchScore('liste fichiers', 'ls', 'Liste les fichiers')).toBeGreaterThan(0);
    expect(matchScore('liste réseau', 'ls', 'Liste les fichiers')).toBe(0);
  });

  it('requête vide : tout correspond', () => {
    expect(matchScore('  ', 'x')).toBe(1);
  });
});
