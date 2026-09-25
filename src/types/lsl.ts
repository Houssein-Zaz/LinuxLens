import type { Permissions } from '../lib/permissions';

export type LslFieldKind =
  | 'inode'
  | 'type'
  | 'perm-owner'
  | 'perm-group'
  | 'perm-others'
  | 'perm-extra'
  | 'links'
  | 'owner'
  | 'group'
  | 'size'
  | 'date'
  | 'name'
  | 'arrow'
  | 'target';

export interface LslField {
  kind: LslFieldKind;
  /** Texte exact dans la ligne. */
  raw: string;
  start: number;
  end: number;
  label: string;
  explanation: string;
}

export type FileTypeChar = '-' | 'd' | 'l' | 'c' | 'b' | 'p' | 's';

export interface LslDate {
  month: number; // 1–12
  day: number;
  /** « 21:14 » quand le fichier a moins de 6 mois. */
  time?: string;
  /** Année, affichée à la place de l'heure pour les fichiers anciens (ou avec --time-style=long-iso). */
  year?: number;
}

export interface LslEntry {
  type: 'entry';
  line: string;
  fields: LslField[];
  fileType: FileTypeChar;
  permissions: Permissions;
  symbolic: string;
  octal: string;
  links: number;
  owner: string;
  group: string;
  /** Taille en octets si elle est exacte, `null` sinon (taille lisible ou périphérique). */
  sizeBytes: number | null;
  date: LslDate;
  name: string;
  target?: string;
}

export interface LslTotal {
  type: 'total';
  line: string;
  blocks: string;
  explanation: string;
}

export interface LslError {
  type: 'error';
  line: string;
  message: string;
}

export type LslLine = LslEntry | LslTotal | LslError;
