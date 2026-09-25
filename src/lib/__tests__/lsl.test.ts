import { formatBytes, parseLsLine, parseLsOutput, parseMonth } from '../lsl';
import type { LslEntry, LslLine } from '../../types/lsl';

function entry(line: string): LslEntry {
  const r: LslLine = parseLsLine(line);
  if (r.type !== 'entry') throw new Error(r.type === 'error' ? r.message : 'pas une entrée');
  return r;
}
const field = (e: LslEntry, kind: string) => e.fields.find((f) => f.kind === kind);

describe('parseLsLine — ligne de référence', () => {
  const line = '-rw-rw-r-- 1 esprit esprit 47 juil. 12 21:14 fichier1';
  const e = entry(line);

  it('extrait chaque information', () => {
    expect(e).toMatchObject({
      fileType: '-',
      symbolic: 'rw-rw-r--',
      octal: '664',
      links: 1,
      owner: 'esprit',
      group: 'esprit',
      sizeBytes: 47,
      date: { month: 7, day: 12, time: '21:14' },
      name: 'fichier1',
    });
    expect(e.target).toBeUndefined();
  });

  it('découpe les blocs dans l’ordre avec des positions exactes', () => {
    expect(e.fields.map((f) => f.kind)).toEqual([
      'type',
      'perm-owner',
      'perm-group',
      'perm-others',
      'links',
      'owner',
      'group',
      'size',
      'date',
      'name',
    ]);
    for (const f of e.fields) expect(line.slice(f.start, f.end)).toBe(f.raw);
    expect(field(e, 'date')?.raw).toBe('juil. 12 21:14');
  });

  it('explique les permissions par catégorie', () => {
    expect(field(e, 'perm-owner')?.explanation).toBe('rw- : lecture, écriture.');
    expect(field(e, 'perm-others')?.explanation).toBe('r-- : lecture.');
    expect(field(e, 'date')?.explanation).toMatch(/12 juillet à 21:14/);
  });
});

describe('types de fichiers', () => {
  it('répertoire', () => {
    const e = entry('drwxr-xr-x 5 esprit esprit 4096 Jul 12 21:10 projets');
    expect(e.fileType).toBe('d');
    expect(e.octal).toBe('755');
    expect(field(e, 'links')?.explanation).toMatch(/sous-répertoires/);
    expect(field(e, 'size')?.explanation).toMatch(/du -sh/);
  });

  it('lien symbolique', () => {
    const line = 'lrwxrwxrwx 1 root root 7 avril 22 2024 bin -> usr/bin';
    const e = entry(line);
    expect(e).toMatchObject({ fileType: 'l', name: 'bin', target: 'usr/bin', octal: '777' });
    expect(e.fields.slice(-3).map((f) => f.kind)).toEqual(['name', 'arrow', 'target']);
    for (const f of e.fields) expect(line.slice(f.start, f.end)).toBe(f.raw);
    expect(field(e, 'perm-owner')?.explanation).toMatch(/ceux de la cible/);
  });

  it('" -> " dans le nom d’un fichier ordinaire reste dans le nom', () => {
    expect(entry('-rw-r--r-- 1 a a 1 Jan 1 2020 a -> b').name).toBe('a -> b');
  });

  it('périphérique caractère : majeur, mineur', () => {
    const e = entry('crw-rw-rw- 1 root root 1, 3 sept. 25 09:12 null');
    expect(e.sizeBytes).toBeNull();
    expect(field(e, 'size')).toMatchObject({ raw: '1, 3', label: 'Numéros de périphérique' });
    expect(e.name).toBe('null');
  });

  it('bits spéciaux : setuid, sticky', () => {
    const passwd = entry('-rwsr-xr-x 1 root root 68208 Feb 6 2024 /usr/bin/passwd');
    expect(passwd.octal).toBe('4755');
    expect(field(passwd, 'perm-owner')?.explanation).toMatch(/setuid/);
    const tmp = entry('drwxrwxrwt 18 root root 4096 Sep 25 10:00 tmp');
    expect(tmp.octal).toBe('1777');
    expect(field(tmp, 'perm-others')?.explanation).toMatch(/sticky/);
  });
});

describe('dates', () => {
  it('année à la place de l’heure', () => {
    const e = entry('-rw-r--r-- 1 esprit esprit 1200 Mar 3 2023 vieux.txt');
    expect(e.date).toEqual({ month: 3, day: 3, year: 2023 });
    expect(field(e, 'date')?.explanation).toMatch(/plus de six mois/);
  });

  it('ordre jour-mois (fr_FR récent, de_DE)', () => {
    expect(entry('-rw-r--r-- 1 a a 5 12 juil. 21:14 f').date).toEqual({ month: 7, day: 12, time: '21:14' });
    expect(entry('-rw-r--r-- 1 a a 5 3. Okt 2022 f').date).toEqual({ month: 10, day: 3, year: 2022 });
  });

  it('mois accentués et variantes', () => {
    expect(parseMonth('févr.')).toBe(2);
    expect(parseMonth('août')).toBe(8);
    expect(parseMonth('déc.')).toBe(12);
    expect(parseMonth('Mär')).toBe(3);
    expect(parseMonth('ene')).toBe(1);
    expect(parseMonth('xyz')).toBeUndefined();
  });

  it('format ISO', () => {
    const e = entry('-rw-r--r-- 1 a a 10 2024-07-12 21:14 f.txt');
    expect(e.date).toEqual({ year: 2024, month: 7, day: 12, time: '21:14' });
    expect(e.name).toBe('f.txt');
    const full = entry('-rw-r--r-- 1 a a 10 2024-07-12 21:14:05.123456789 +0200 f.txt');
    expect(full.name).toBe('f.txt');
  });
});

describe('variantes', () => {
  it('taille lisible (ls -lh)', () => {
    const e = entry('-rw-r--r-- 1 a a 4,0K Jul 12 21:14 f');
    expect(e.sizeBytes).toBeNull();
    expect(field(e, 'size')?.explanation).toMatch(/-h/);
    expect(entry('-rw-r--r-- 1 a a 1.5G Jul 12 21:14 f').fields.find((f) => f.kind === 'size')?.raw).toBe('1.5G');
  });

  it('grande taille exacte convertie', () => {
    expect(field(entry('-rw-r--r-- 1 a a 1048576 Jul 12 21:14 f'), 'size')?.explanation).toMatch(/1 Mio/);
  });

  it('inode en tête (ls -li)', () => {
    const e = entry('1837465 -rw-r--r-- 1 a a 5 Jul 12 21:14 f');
    expect(e.fields[0]?.kind).toBe('inode');
  });

  it('ACL et SELinux', () => {
    expect(field(entry('-rw-rw-r--+ 1 a a 5 Jul 12 21:14 f'), 'perm-extra')?.explanation).toMatch(/ACL/);
    expect(field(entry('-rw-r--r--. 1 a a 5 Jul 12 21:14 f'), 'perm-extra')?.explanation).toMatch(/SELinux/);
  });

  it('nom avec espaces et fichier caché', () => {
    const e = entry('-rw-r--r-- 1 a a 5 Jul 12 21:14 mon fichier .txt');
    expect(e.name).toBe('mon fichier .txt');
    expect(field(entry('-rw-r--r-- 1 a a 5 Jul 12 21:14 .bashrc'), 'name')?.explanation).toMatch(/caché/);
  });

  it('espaces multiples d’alignement', () => {
    const line = '-rw-r--r--  1 esprit esprit    47 juil. 12 21:14 fichier1';
    const e = entry(line);
    for (const f of e.fields) expect(line.slice(f.start, f.end)).toBe(f.raw);
  });
});

describe('erreurs et sortie complète', () => {
  it.each([
    ['bonjour', /premier bloc/],
    ['-rw-r--r-- x a a 5 Jul 12 21:14 f', /nombre de liens/],
    ['-rw-r--r-- 1 a a 5 Foo 12 21:14 f', /Date non reconnue/],
    ['-rw-r--r-- 1 a a 5 Jul 12 21:14', /nom du fichier/],
  ])('%s', (line, message) => {
    const r = parseLsLine(line);
    expect(r.type).toBe('error');
    expect(r.type === 'error' && r.message).toMatch(message);
  });

  it('ligne total et plusieurs lignes', () => {
    const out = parseLsOutput('total 12\ndrwxr-xr-x 2 a a 4096 Jul 12 21:10 d\n\n-rw-r--r-- 1 a a 5 Jul 12 21:14 f\n');
    expect(out.map((l) => l.type)).toEqual(['total', 'entry', 'entry']);
  });

  it('formatBytes', () => {
    expect(formatBytes(1)).toBe('1 octet');
    expect(formatBytes(512)).toBe('512 octets');
    expect(formatBytes(4096)).toBe('4 Kio');
    expect(formatBytes(1536)).toBe('1,5 Kio');
  });
});
