import { getLang, labels, tr } from '../i18n';

export type Who = 'owner' | 'group' | 'others';
export type Right = 'read' | 'write' | 'execute';

export interface Triplet {
  read: boolean;
  write: boolean;
  execute: boolean;
}

export interface Permissions {
  owner: Triplet;
  group: Triplet;
  others: Triplet;
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
}

export const WHO: Who[] = ['owner', 'group', 'others'];
export const RIGHTS: Right[] = ['read', 'write', 'execute'];

export const WHO_LABEL: Record<Who, string> = labels({ owner: ['propriétaire', 'owner'], group: ['groupe', 'group'], others: ['autres', 'others'] });
export const RIGHT_LABEL: Record<Right, string> = labels({ read: ['lecture', 'read'], write: ['écriture', 'write'], execute: ['exécution', 'execute'] });

const empty = (): Triplet => ({ read: false, write: false, execute: false });

export function emptyPermissions(): Permissions {
  return { owner: empty(), group: empty(), others: empty(), setuid: false, setgid: false, sticky: false };
}

const tripletValue = (t: Triplet) => (t.read ? 4 : 0) + (t.write ? 2 : 0) + (t.execute ? 1 : 0);
const tripletFrom = (n: number): Triplet => ({ read: (n & 4) !== 0, write: (n & 2) !== 0, execute: (n & 1) !== 0 });

/** `755`, `0644`, `4755` → permissions. Renvoie `null` si la notation est invalide. */
export function fromOctal(octal: string): Permissions | null {
  if (!/^[0-7]{3,4}$/.test(octal)) return null;
  const digits = octal.padStart(4, '0').split('').map(Number) as [number, number, number, number];
  const [special, o, g, a] = digits;
  return {
    owner: tripletFrom(o),
    group: tripletFrom(g),
    others: tripletFrom(a),
    setuid: (special & 4) !== 0,
    setgid: (special & 2) !== 0,
    sticky: (special & 1) !== 0,
  };
}

/** Notation octale : 3 chiffres, ou 4 si un bit spécial (setuid, setgid, sticky) est actif. */
export function toOctal(p: Permissions): string {
  const special = (p.setuid ? 4 : 0) + (p.setgid ? 2 : 0) + (p.sticky ? 1 : 0);
  const base = `${tripletValue(p.owner)}${tripletValue(p.group)}${tripletValue(p.others)}`;
  return special ? `${special}${base}` : base;
}

/** Notation de `ls -l` sur 9 caractères : `rwxr-x---`, avec s/S et t/T pour les bits spéciaux. */
export function toSymbolic(p: Permissions): string {
  const part = (t: Triplet, special: boolean, letter: 's' | 't') => {
    const x = special ? (t.execute ? letter : letter.toUpperCase()) : t.execute ? 'x' : '-';
    return `${t.read ? 'r' : '-'}${t.write ? 'w' : '-'}${x}`;
  };
  return part(p.owner, p.setuid, 's') + part(p.group, p.setgid, 's') + part(p.others, p.sticky, 't');
}

/** `rwxr-x---` (9 caractères, s/S/t/T acceptés) → permissions, ou `null`. */
export function fromSymbolic(s: string): Permissions | null {
  if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s)) return null;
  const triplet = (i: number): Triplet => ({
    read: s[i] === 'r',
    write: s[i + 1] === 'w',
    execute: ['x', 's', 't'].includes(s[i + 2]!),
  });
  return {
    owner: triplet(0),
    group: triplet(3),
    others: triplet(6),
    setuid: 'sS'.includes(s[2]!),
    setgid: 'sS'.includes(s[5]!),
    sticky: 'tT'.includes(s[8]!),
  };
}

/** Commande chmod équivalente. */
export function toChmodCommand(p: Permissions, target = tr('fichier', 'file')): string {
  return `chmod ${toOctal(p)} ${target}`;
}

/** Notation symbolique explicite pour chmod : `u=rwx,g=rx,o=`. */
export function toChmodSymbolic(p: Permissions): string {
  const part = (t: Triplet) => `${t.read ? 'r' : ''}${t.write ? 'w' : ''}${t.execute ? 'x' : ''}`;
  return `u=${part(p.owner)}${p.setuid ? 's' : ''},g=${part(p.group)}${p.setgid ? 's' : ''},o=${part(p.others)}${p.sticky ? 't' : ''}`;
}

/** « lecture, écriture » ; « aucun droit » si vide. */
export function describeTriplet(t: Triplet): string {
  const rights = RIGHTS.filter((r) => t[r]).map((r) => RIGHT_LABEL[r]);
  return rights.length ? rights.join(', ') : tr('aucun droit', 'no permissions');
}

/** Phrase complète : « propriétaire : lecture, écriture ; groupe : lecture ; autres : aucun droit ». */
export function describePermissions(p: Permissions): string {
  const colon = tr(' : ', ': ');
  const parts = WHO.map((w) => `${WHO_LABEL[w]}${colon}${describeTriplet(p[w])}`);
  const special = [p.setuid && 'setuid', p.setgid && 'setgid', p.sticky && 'sticky bit'].filter(Boolean);
  return parts.join(tr(' ; ', '; ')) + (special.length ? ` (+ ${special.join(', ')})` : '');
}

/* ------------------------------------------------------------------ */
/* Notation symbolique de chmod : u+x, go-w, a=r…                      */
/* ------------------------------------------------------------------ */

const WHO_LETTERS: Record<string, Who[]> = { u: ['owner'], g: ['group'], o: ['others'], a: ['owner', 'group', 'others'] };
const WHO_PHRASE: Record<string, string> = labels({
  u: ['le propriétaire', 'the owner'],
  g: ['le groupe', 'the group'],
  o: ['les autres', 'others'],
  a: ['tout le monde', 'everyone'],
});
const WHO_DATIVE: Record<string, string> = labels({
  u: ['au propriétaire', 'to the owner'],
  g: ['au groupe', 'to the group'],
  o: ['aux autres', 'to others'],
  a: ['à tout le monde', 'to everyone'],
});
const PERM_PHRASE: Record<string, string> = labels({
  r: ['la lecture', 'read'],
  w: ["l'écriture", 'write'],
  x: ["l'exécution", 'execute'],
  X: ["l'exécution (répertoires et fichiers déjà exécutables)", 'execute (directories and files that are already executable)'],
  s: ['le bit setuid/setgid', 'the setuid/setgid bit'],
  t: ['le sticky bit', 'the sticky bit'],
});

interface Clause {
  who: string;
  actions: Array<{ op: '+' | '-' | '='; perms: string }>;
}

function parseClauses(mode: string): Clause[] | null {
  const clauses: Clause[] = [];
  for (const part of mode.split(',')) {
    const m = /^([ugoa]*)((?:[+=-](?:[ugo]|[rwxXst]*))+)$/.exec(part);
    if (!m) return null;
    const actions = [...m[2]!.matchAll(/([+=-])([ugo]|[rwxXst]*)/g)].map((a) => ({
      op: a[1] as '+' | '-' | '=',
      perms: a[2]!,
    }));
    clauses.push({ who: m[1]!, actions });
  }
  return clauses;
}

const joinList = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ${tr('et', 'and')} ${items.at(-1)}`;

/** Explication d'un mode symbolique dans la langue courante, ou `null` s'il est invalide. */
export function describeSymbolicMode(mode: string): string | null {
  const clauses = parseClauses(mode);
  if (!clauses) return null;
  const sentences = clauses.flatMap(({ who, actions }) => {
    const letters = [...new Set(who)];
    const whoText = who ? joinList(letters.map((c) => WHO_PHRASE[c]!)) : tr('tout le monde (selon umask)', 'everyone (subject to umask)');
    const whoDative = who ? joinList(letters.map((c) => WHO_DATIVE[c]!)) : tr('à tout le monde (selon umask)', 'to everyone (subject to umask)');
    const en = getLang() === 'en';
    return actions.map(({ op, perms }) => {
      const copy = /^[ugo]$/.test(perms);
      const permText = copy
        ? tr(`les mêmes droits que ${WHO_PHRASE[perms]}`, `the same permissions as ${WHO_PHRASE[perms]}`)
        : joinList([...perms].map((c) => PERM_PHRASE[c]!));
      if (en) {
        if (op === '+') return `adds ${permText} for ${whoText}`;
        if (op === '-') return `removes ${permText} for ${whoText}`;
        return perms ? `gives exactly ${permText} ${whoDative}` : `removes all permissions from ${whoText}`;
      }
      if (op === '+') return `ajoute ${permText} pour ${whoText}`;
      if (op === '-') return `retire ${permText} pour ${whoText}`;
      return perms ? `donne exactement ${permText} ${whoDative}` : `retire tous les droits ${whoDative}`;
    });
  });
  const text = sentences.join(tr(', puis ', ', then '));
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

/** Applique un mode chmod (octal ou symbolique) à des permissions de départ. */
export function applyChmod(base: Permissions, mode: string, isDirectory = false): Permissions | null {
  const octal = fromOctal(mode);
  if (octal) return octal;
  const clauses = parseClauses(mode);
  if (!clauses) return null;

  const p: Permissions = structuredClone(base);
  for (const { who, actions } of clauses) {
    const targets = who ? [...new Set([...who].flatMap((c) => WHO_LETTERS[c]!))] : WHO;
    for (const { op, perms } of actions) {
      const copyFrom = /^[ugo]$/.test(perms) ? WHO_LETTERS[perms]![0]! : null;
      for (const w of targets) {
        const snapshot = copyFrom ? { ...p[copyFrom] } : null;
        const wanted: Triplet = snapshot ?? {
          read: perms.includes('r'),
          write: perms.includes('w'),
          execute:
            perms.includes('x') ||
            (perms.includes('X') && (isDirectory || p.owner.execute || p.group.execute || p.others.execute)),
        };
        const special = !snapshot && perms.includes('s') && w !== 'others';
        const sticky = !snapshot && perms.includes('t');
        for (const r of RIGHTS) {
          if (op === '+') p[w][r] ||= wanted[r];
          else if (op === '-') p[w][r] &&= !wanted[r];
          else p[w][r] = wanted[r];
        }
        const setSpecial = (key: 'setuid' | 'setgid' | 'sticky', on: boolean) => {
          if (op === '+') p[key] ||= on;
          else if (op === '-') p[key] &&= !on;
          else p[key] = on;
        };
        if (w === 'owner') setSpecial('setuid', special);
        if (w === 'group') setSpecial('setgid', special);
        if (w === 'others' || !who) setSpecial('sticky', sticky);
      }
    }
  }
  return p;
}
