import type { FileTypeChar, LslDate, LslEntry, LslField, LslLine } from '../types/lsl';
import { describeTriplet, fromSymbolic, toOctal, type Triplet } from './permissions';
import { normalize } from './search';

export const FILE_TYPES: Record<FileTypeChar, { label: string; explanation: string }> = {
  '-': { label: 'Fichier ordinaire', explanation: 'Un fichier classique : texte, image, programme…' },
  d: { label: 'Répertoire', explanation: 'Un dossier, qui contient d’autres fichiers.' },
  l: { label: 'Lien symbolique', explanation: 'Un raccourci qui pointe vers un autre chemin (affiché après « -> »).' },
  c: { label: 'Périphérique caractère', explanation: 'Un périphérique lu octet par octet (terminal, /dev/null…).' },
  b: { label: 'Périphérique bloc', explanation: 'Un périphérique lu par blocs (disque, partition…).' },
  p: { label: 'Tube nommé (FIFO)', explanation: 'Un canal de communication entre processus.' },
  s: { label: 'Socket', explanation: 'Un point de communication local entre processus.' },
};

/** Abréviations de mois (fr, en, de, es, it), sans accents ni point final. */
const MONTHS: Record<string, number> = {};
const MONTH_NAMES: string[][] = [
  ['janv', 'jan', 'ene', 'gen', 'janvier', 'january', 'januar', 'jän', 'jaen'],
  ['fevr', 'fev', 'feb', 'fevrier', 'february', 'februar', 'febr'],
  ['mars', 'mar', 'mär', 'maer', 'mrz', 'march', 'marz'],
  ['avr', 'apr', 'abr', 'avril', 'april'],
  ['mai', 'may', 'mag'],
  ['juin', 'jun', 'june', 'juni', 'giu'],
  ['juil', 'jul', 'july', 'juli', 'juillet', 'lug'],
  ['aout', 'aug', 'ago', 'august'],
  ['sept', 'sep', 'set', 'september', 'septembre'],
  ['oct', 'okt', 'october', 'oktober', 'octobre', 'ott'],
  ['nov', 'november', 'novembre'],
  ['dec', 'dez', 'dic', 'december', 'dezember', 'decembre'],
];
MONTH_NAMES.forEach((names, i) => names.forEach((n) => (MONTHS[normalize(n)] = i + 1)));

const MONTH_LABEL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function parseMonth(word: string): number | undefined {
  return MONTHS[normalize(word).replace(/\.$/, '')];
}

const PERM_RE = /^([-dlcbps])([r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-])([.+@]?)$/;
const SIZE_RE = /^\d+(?:[.,]\d+)?[KMGTPEkB]?(?:i?B)?$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;
const YEAR_RE = /^\d{4}$/;
const DAY_RE = /^\d{1,2}$/;

interface Word {
  text: string;
  start: number;
  end: number;
}

const WHO_FIELDS: Array<{ kind: 'perm-owner' | 'perm-group' | 'perm-others'; label: string }> = [
  { kind: 'perm-owner', label: 'Droits du propriétaire' },
  { kind: 'perm-group', label: 'Droits du groupe' },
  { kind: 'perm-others', label: 'Droits des autres' },
];

function describeSpecial(chars: string, index: 0 | 1 | 2): string | undefined {
  const c = chars[2];
  if (index < 2 && (c === 's' || c === 'S')) {
    const bit = index === 0 ? 'setuid' : 'setgid';
    const effect =
      index === 0
        ? 'le programme s’exécute avec les droits de son propriétaire'
        : 'le programme s’exécute avec les droits du groupe (sur un répertoire : les nouveaux fichiers héritent du groupe)';
    return `« ${c} » : bit ${bit} actif — ${effect}${c === 'S' ? ', mais x est absent, donc sans effet' : ''}.`;
  }
  if (index === 2 && (c === 't' || c === 'T')) {
    return `« ${c} » : sticky bit — dans ce répertoire, seul le propriétaire d’un fichier peut le supprimer ou le renommer (ex. /tmp)${
      c === 'T' ? ' ; x est absent pour les autres' : ''
    }.`;
  }
  return undefined;
}

export function formatBytes(n: number): string {
  const units = ['octets', 'Kio', 'Mio', 'Gio', 'Tio'];
  let v = n;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  const num = u === 0 ? String(v) : v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  return `${num} ${u === 0 && n <= 1 ? 'octet' : units[u]}`;
}

/** Tente de lire la date à partir du mot `i`. Renvoie la date et le nombre de mots consommés. */
function parseDate(words: Word[], i: number): { date: LslDate; count: number } | null {
  const [a, b, c] = [words[i]?.text, words[i + 1]?.text, words[i + 2]?.text];
  if (!a || !b) return null;

  // ISO : 2024-07-12 21:14[:05.123] [+0200]
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a);
  if (iso && /^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(b)) {
    const zone = c && /^[+-]\d{4}$/.test(c) ? 1 : 0;
    return {
      date: { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]), time: b.slice(0, 5) },
      count: 2 + zone,
    };
  }
  // ISO court (fichiers récents avec --time-style=iso) : 07-12 21:14
  const isoShort = /^(\d{2})-(\d{2})$/.exec(a);
  if (isoShort && TIME_RE.test(b)) {
    return { date: { month: Number(isoShort[1]), day: Number(isoShort[2]), time: b }, count: 2 };
  }
  if (!c) return null;

  const timeOrYear = (w: string): Pick<LslDate, 'time' | 'year'> | null =>
    TIME_RE.test(w) ? { time: w } : YEAR_RE.test(w) ? { year: Number(w) } : null;

  // MOIS JOUR HEURE|ANNÉE (en_US, et fr_FR des anciennes versions : « juil. 12 21:14 »)
  const m1 = parseMonth(a);
  const t1 = timeOrYear(c);
  if (m1 && DAY_RE.test(b) && t1) return { date: { month: m1, day: Number(b), ...t1 }, count: 3 };

  // JOUR MOIS HEURE|ANNÉE (fr_FR, de_DE récents : « 12 juil. 21:14 »)
  const m2 = parseMonth(b);
  if (m2 && DAY_RE.test(a.replace(/\.$/, '')) && t1) {
    return { date: { month: m2, day: Number(a.replace(/\.$/, '')), ...t1 }, count: 3 };
  }
  return null;
}

function explainDate(d: LslDate): string {
  const when = `${d.day} ${MONTH_LABEL[d.month - 1]}${d.year ? ` ${d.year}` : ''}${d.time ? ` à ${d.time}` : ''}`;
  if (d.year && !d.time) {
    return `Dernière modification : ${when}. L’année remplace l’heure parce que le fichier a été modifié il y a plus de six mois (ou dans le futur).`;
  }
  if (!d.year) {
    return `Dernière modification : ${when}. L’heure est affichée (sans l’année) car la modification date de moins de six mois.`;
  }
  return `Dernière modification : ${when}.`;
}

/** Analyse une ligne de sortie de `ls -l`. */
export function parseLsLine(line: string): LslLine {
  const trimmed = line.replace(/\s+$/, '');
  const total = /^\s*total\s+(\S+)$/.exec(trimmed);
  if (total) {
    return {
      type: 'total',
      line: trimmed,
      blocks: total[1]!,
      explanation: `Espace disque occupé par les fichiers listés : ${total[1]} blocs (en général de 1 Kio). Ce n’est pas la somme des tailles affichées.`,
    };
  }

  const words: Word[] = [...trimmed.matchAll(/\S+/g)].map((m) => ({ text: m[0], start: m.index, end: m.index + m[0].length }));
  const fail = (message: string): LslLine => ({ type: 'error', line: trimmed, message });
  if (words.length === 0) return fail('Ligne vide.');

  const fields: LslField[] = [];
  const add = (w: Word | { text: string; start: number; end: number }, kind: LslField['kind'], label: string, explanation: string) =>
    fields.push({ kind, raw: w.text, start: w.start, end: w.end, label, explanation });

  let i = 0;
  // Numéro d'inode facultatif (ls -li)
  if (/^\d+$/.test(words[0]!.text) && words[1] && PERM_RE.test(words[1].text)) {
    add(words[0]!, 'inode', 'Inode', 'Numéro d’inode : l’identifiant du fichier sur le système de fichiers (affiché par ls -i).');
    i = 1;
  }

  const permWord = words[i];
  const perm = permWord && PERM_RE.exec(permWord.text);
  if (!permWord || !perm) {
    return fail('Le premier bloc doit ressembler à « -rw-r--r-- » : un caractère de type suivi de 9 caractères de permissions.');
  }
  const fileType = perm[1] as FileTypeChar;
  const rwx = perm[2]!;
  const extra = perm[3]!;
  const permissions = fromSymbolic(rwx)!;
  const typeInfo = FILE_TYPES[fileType];
  const isLink = fileType === 'l';

  add({ text: fileType, start: permWord.start, end: permWord.start + 1 }, 'type', `Type : ${typeInfo.label}`, `« ${fileType} » — ${typeInfo.explanation}`);
  const triplets: Triplet[] = [permissions.owner, permissions.group, permissions.others];
  WHO_FIELDS.forEach(({ kind, label }, k) => {
    const start = permWord.start + 1 + k * 3;
    const chars = rwx.slice(k * 3, k * 3 + 3);
    const special = describeSpecial(chars, k as 0 | 1 | 2);
    const base = `${chars} : ${describeTriplet(triplets[k]!)}.`;
    add({ text: chars, start, end: start + 3 }, kind, label, [base, special].filter(Boolean).join(' '));
  });
  if (extra) {
    const start = permWord.start + 10;
    const text =
      extra === '+'
        ? '« + » : des ACL (listes de contrôle d’accès) ajoutent des droits supplémentaires ; voir getfacl.'
        : extra === '.'
          ? '« . » : le fichier possède un contexte de sécurité SELinux.'
          : '« @ » (macOS) : le fichier possède des attributs étendus.';
    add({ text: extra, start, end: start + 1 }, 'perm-extra', 'Attributs supplémentaires', text);
  }
  i++;

  const linksWord = words[i];
  if (!linksWord || !/^\d+$/.test(linksWord.text)) return fail('Le nombre de liens (un entier) est attendu après les permissions.');
  const links = Number(linksWord.text);
  add(
    linksWord,
    'links',
    'Liens physiques',
    fileType === 'd'
      ? `${links} liens : pour un répertoire, c’est 2 (son nom et « . ») plus le nombre de sous-répertoires (leur « .. »).`
      : `${links} nom${links > 1 ? 's' : ''} (lien${links > 1 ? 's' : ''} physique${links > 1 ? 's' : ''}) pointe${links > 1 ? 'nt' : ''} vers ce contenu sur le disque.`,
  );
  i++;

  const ownerWord = words[i];
  const groupWord = words[i + 1];
  if (!ownerWord || !groupWord) return fail('Le propriétaire et le groupe sont attendus après le nombre de liens.');
  add(ownerWord, 'owner', 'Propriétaire', `L’utilisateur « ${ownerWord.text} » possède le fichier ; les 3 premiers droits s’appliquent à lui.`);
  add(groupWord, 'group', 'Groupe', `Le groupe « ${groupWord.text} » ; les 3 droits du milieu s’appliquent à ses membres.`);
  i += 2;

  // Taille, ou « majeur, mineur » pour un périphérique
  let sizeBytes: number | null = null;
  const sizeWord = words[i];
  if (!sizeWord) return fail('La taille est attendue après le groupe.');
  if ((fileType === 'c' || fileType === 'b') && /^\d+,$/.test(sizeWord.text) && words[i + 1] && /^\d+$/.test(words[i + 1]!.text)) {
    const minor = words[i + 1]!;
    add(
      { text: `${sizeWord.text} ${minor.text}`, start: sizeWord.start, end: minor.end },
      'size',
      'Numéros de périphérique',
      `Majeur ${sizeWord.text.slice(0, -1)} (le pilote) et mineur ${minor.text} (l’appareil précis) : un périphérique n’a pas de taille.`,
    );
    i += 2;
  } else if (SIZE_RE.test(sizeWord.text)) {
    const exact = /^\d+$/.test(sizeWord.text);
    sizeBytes = exact ? Number(sizeWord.text) : null;
    add(
      sizeWord,
      'size',
      'Taille',
      exact
        ? `${sizeWord.text} octet${sizeBytes! > 1 ? 's' : ''}${sizeBytes! >= 1024 ? ` (≈ ${formatBytes(sizeBytes!)})` : ''}.${
            fileType === 'd' ? ' Pour un répertoire, c’est la taille de la liste des noms, pas celle du contenu (voir du -sh).' : ''
          }${isLink ? ' Pour un lien, c’est la longueur du chemin cible.' : ''}`
        : `${sizeWord.text} : taille arrondie en unités lisibles (option -h ; K = Kio, M = Mio, G = Gio).`,
    );
    i++;
  } else {
    return fail(`« ${sizeWord.text} » n’est pas une taille valide.`);
  }

  const parsedDate = parseDate(words, i);
  if (!parsedDate) return fail('Date non reconnue. Formats acceptés : « juil. 12 21:14 », « 12 juil. 2023 », « Jul 12 21:14 », « 2024-07-12 21:14 ».');
  const firstDate = words[i]!;
  const lastDate = words[i + parsedDate.count - 1]!;
  add(
    { text: trimmed.slice(firstDate.start, lastDate.end), start: firstDate.start, end: lastDate.end },
    'date',
    'Date de modification',
    explainDate(parsedDate.date),
  );
  i += parsedDate.count;

  const nameWord = words[i];
  if (!nameWord) return fail('Le nom du fichier est attendu après la date.');
  const rest = trimmed.slice(nameWord.start);
  const arrowAt = isLink ? rest.indexOf(' -> ') : -1;
  const name = arrowAt === -1 ? rest : rest.slice(0, arrowAt);
  const nameStart = nameWord.start;
  add(
    { text: name, start: nameStart, end: nameStart + name.length },
    'name',
    'Nom',
    `${name.startsWith('.') ? 'Fichier caché (le nom commence par un point). ' : ''}Nom de l’entrée dans le répertoire.`,
  );

  let target: string | undefined;
  if (arrowAt !== -1) {
    const arrowStart = nameStart + arrowAt + 1;
    target = rest.slice(arrowAt + 4);
    add({ text: '->', start: arrowStart, end: arrowStart + 2 }, 'arrow', 'Flèche', 'Sépare le nom du lien de sa cible.');
    add(
      { text: target, start: arrowStart + 3, end: arrowStart + 3 + target.length },
      'target',
      'Cible du lien',
      `Le lien pointe vers « ${target} »${target.startsWith('/') ? ' (chemin absolu)' : ' (chemin relatif au répertoire du lien)'}.`,
    );
  }

  if (isLink) {
    const ownerField = fields.find((f) => f.kind === 'perm-owner')!;
    ownerField.explanation += ' Les droits d’un lien symbolique ne sont pas utilisés : ce sont ceux de la cible qui comptent.';
  }

  const entry: LslEntry = {
    type: 'entry',
    line: trimmed,
    fields,
    fileType,
    permissions,
    symbolic: rwx,
    octal: toOctal(permissions),
    links,
    owner: ownerWord.text,
    group: groupWord.text,
    sizeBytes,
    date: parsedDate.date,
    name,
    ...(target !== undefined && { target }),
  };
  return entry;
}

/** Analyse plusieurs lignes collées (sortie complète de ls -l). */
export function parseLsOutput(text: string): LslLine[] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map(parseLsLine);
}
