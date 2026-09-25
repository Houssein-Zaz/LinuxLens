import { CATEGORY_IDS } from '../types/command';

const DANGER_LEVELS = ['safe', 'caution', 'danger'];
const SHORT_RE = /^-[A-Za-z0-9?#]$/;
const LONG_RE = /^--[A-Za-z0-9][A-Za-z0-9-]*$/; // less --LINE-NUMBERS
const SINGLE_DASH_LONG_RE = /^-(?:[a-z][a-z0-9-]+|\d+)$/; // find -name, kill -15…

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * Valide une fiche de commande à l'exécution (JSON écrit à la main).
 * Renvoie la liste des problèmes ; tableau vide si la fiche est valide.
 */
export function validateCommandDoc(doc: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(doc)) return ['la fiche doit être un objet'];

  const requireString = (obj: Obj, key: string, path: string) => {
    if (!isNonEmptyString(obj[key])) errors.push(`${path}${key} : chaîne non vide attendue`);
  };

  const allowed = new Set([
    'name',
    'category',
    'summary',
    'description',
    'synopsis',
    'options',
    'arguments',
    'subcommands',
    'examples',
    'seeAlso',
    'dangerLevel',
    'dangerNote',
  ]);
  for (const key of Object.keys(doc)) if (!allowed.has(key)) errors.push(`champ inconnu : ${key}`);

  for (const key of ['name', 'summary', 'description', 'synopsis']) requireString(doc, key, '');
  if (!(CATEGORY_IDS as readonly unknown[]).includes(doc.category)) errors.push(`category invalide : ${String(doc.category)}`);

  if (!Array.isArray(doc.options)) {
    errors.push('options : tableau attendu');
  } else {
    const seen = new Set<string>();
    doc.options.forEach((opt, i) => {
      const path = `options[${i}].`;
      if (!isObj(opt)) return errors.push(`${path} objet attendu`);
      requireString(opt, 'description', path);
      if (opt.short === undefined && opt.long === undefined) errors.push(`${path} short ou long requis`);
      if (opt.short !== undefined && !(typeof opt.short === 'string' && (SHORT_RE.test(opt.short) || SINGLE_DASH_LONG_RE.test(opt.short)))) {
        errors.push(`${path}short invalide : ${String(opt.short)}`);
      }
      if (opt.long !== undefined && !(typeof opt.long === 'string' && LONG_RE.test(opt.long))) {
        errors.push(`${path}long invalide : ${String(opt.long)}`);
      }
      for (const flag of [opt.short, opt.long]) {
        if (typeof flag !== 'string') continue;
        if (seen.has(flag)) errors.push(`option en double : ${flag}`);
        seen.add(flag);
      }
      if (opt.values !== undefined && !(Array.isArray(opt.values) && opt.values.every(isNonEmptyString))) {
        errors.push(`${path}values : tableau de chaînes attendu`);
      }
      if (opt.values !== undefined && opt.takesValue !== true) errors.push(`${path}values sans takesValue`);
    });
  }

  if (!Array.isArray(doc.examples) || doc.examples.length === 0) {
    errors.push('examples : au moins un exemple attendu');
  } else {
    doc.examples.forEach((ex, i) => {
      const path = `examples[${i}].`;
      if (!isObj(ex)) return errors.push(`${path} objet attendu`);
      requireString(ex, 'command', path);
      requireString(ex, 'explanation', path);
      if (ex.output !== undefined && typeof ex.output !== 'string') errors.push(`${path}output : chaîne attendue`);
    });
  }

  for (const key of ['arguments', 'subcommands'] as const) {
    const list = doc[key];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      errors.push(`${key} : tableau attendu`);
      continue;
    }
    list.forEach((item, i) => {
      if (!isObj(item)) return errors.push(`${key}[${i}] : objet attendu`);
      requireString(item, 'name', `${key}[${i}].`);
      requireString(item, 'description', `${key}[${i}].`);
    });
  }

  if (doc.seeAlso !== undefined && !(Array.isArray(doc.seeAlso) && doc.seeAlso.every(isNonEmptyString))) {
    errors.push('seeAlso : tableau de chaînes attendu');
  }
  if (doc.dangerLevel !== undefined && !DANGER_LEVELS.includes(doc.dangerLevel as string)) {
    errors.push(`dangerLevel invalide : ${String(doc.dangerLevel)}`);
  }
  if (doc.dangerLevel !== undefined && doc.dangerLevel !== 'safe' && !isNonEmptyString(doc.dangerNote)) {
    errors.push('dangerNote requis quand dangerLevel vaut caution ou danger');
  }

  return errors;
}
