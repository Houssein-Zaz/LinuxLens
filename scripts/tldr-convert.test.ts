import { cleanCommand, parseTldrPage, pickPages, shortSummary } from './tldr-convert';
import type { TldrDoc } from '../src/types/command';

const TAR_FR = `# tar

> Utilitaire d'archivage.
> Souvent combiné avec une méthode de compression, telle que gzip ou bzip2.
> Plus d'informations : <https://www.gnu.org/software/tar/manual/tar.html>.

- Crée une archive à partir de fichiers :

\`tar cf {{chemin/vers/cible.tar}} {{chemin/vers/fichier1 chemin/vers/fichier2 ...}}\`

- Extrait une archive dans un répertoire cible :

\`tar xf {{chemin/vers/source.tar.ext}} {{[-C|--directory]}} {{chemin/vers/répertoire}}\`
`;

describe('parseTldrPage', () => {
  it('convertit une page française', () => {
    const doc = parseTldrPage(TAR_FR, 'tar', 'fr', 'common');
    expect(doc).toEqual({
      name: 'tar',
      summary: "Utilitaire d'archivage. Souvent combiné avec une méthode de compression, telle que gzip ou bzip2.",
      moreInfoUrl: 'https://www.gnu.org/software/tar/manual/tar.html',
      lang: 'fr',
      platform: 'common',
      sourceUrl: 'https://github.com/tldr-pages/tldr/blob/main/pages.fr/common/tar.md',
      examples: [
        {
          description: 'Crée une archive à partir de fichiers',
          command: 'tar cf chemin/vers/cible.tar chemin/vers/fichier1 chemin/vers/fichier2 ...',
        },
        {
          description: 'Extrait une archive dans un répertoire cible',
          command: 'tar xf chemin/vers/source.tar.ext -C chemin/vers/répertoire',
        },
      ],
    });
  });

  it('lit « More information » en anglais et le CRLF', () => {
    const md = '# ls\r\n\r\n> List directory contents.\r\n> More information: <https://example.org>.\r\n\r\n- List files:\r\n\r\n`ls`\r\n';
    const doc = parseTldrPage(md, 'ls', 'en', 'common');
    expect(doc?.moreInfoUrl).toBe('https://example.org');
    expect(doc?.sourceUrl).toMatch(/\/pages\/common\/ls\.md$/);
    expect(doc?.examples).toEqual([{ description: 'List files', command: 'ls' }]);
  });

  it('rejette une page sans exemple', () => {
    expect(parseTldrPage('# x\n\n> Rien.\n', 'x', 'en', 'common')).toBeNull();
  });
});

describe('utilitaires', () => {
  it('cleanCommand', () => {
    expect(cleanCommand('grep {{[-i|--ignore-case]}} "{{motif}}" {{fichier}}')).toBe('grep -i "motif" fichier');
    expect(cleanCommand('echo \\{\\{ok\\}\\}')).toBe('echo {{ok}}');
  });

  it('shortSummary garde la première phrase', () => {
    expect(shortSummary("Utilitaire d'archivage. Souvent combiné…")).toBe("Utilitaire d'archivage.");
    expect(shortSummary('Pas de point final')).toBe('Pas de point final');
  });

  it('pickPages : français puis anglais, Linux avant commun', () => {
    const page = (lang: 'fr' | 'en', platform: 'linux' | 'common'): TldrDoc => ({
      name: 'x',
      summary: `${lang}-${platform}`,
      examples: [],
      lang,
      platform,
      sourceUrl: '',
    });
    const pick = (...pages: TldrDoc[]) => pickPages(pages).get('x')?.summary;
    expect(pick(page('en', 'linux'), page('fr', 'common'))).toBe('fr-common');
    expect(pick(page('fr', 'common'), page('fr', 'linux'))).toBe('fr-linux');
    expect(pick(page('en', 'common'), page('en', 'linux'))).toBe('en-linux');
  });
});
