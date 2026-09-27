/**
 * Télécharge les pages tldr-pages (Linux + communes, français et anglais)
 * et les convertit en JSON :
 *   - public/tldr/     : site en français (page française, sinon anglaise)
 *   - public/tldr/en/  : site en anglais (pages anglaises)
 * Dans chaque dossier :
 *   - index.json        : [{ name, summary, lang }] pour la recherche et l'autocomplétion
 *   - pages/<nom>.json  : fiche complète, chargée à la demande
 *
 * Les archives sont mises en cache dans .cache/tldr/ (supprimer le dossier pour forcer la mise à jour,
 * ou lancer avec --refresh). En cas d'échec réseau sans cache, le build continue sans données tldr.
 *
 * Données : https://github.com/tldr-pages/tldr — licence CC BY 4.0.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import type { TldrDoc, TldrIndexEntry } from '../src/types/command';
import { parseTldrPage, pickPages, SAFE_NAME, shortSummary, type Lang, type Platform } from './tldr-convert';

const ROOT = join(import.meta.dirname, '..');
const CACHE_DIR = join(ROOT, '.cache', 'tldr');
const OUT_DIR = join(ROOT, 'public', 'tldr');
const RELEASE = 'https://github.com/tldr-pages/tldr/releases/latest/download';
const ARCHIVES: Record<Lang, string> = { fr: 'tldr-pages.fr.zip', en: 'tldr-pages.en.zip' };
const PLATFORMS: Platform[] = ['common', 'linux'];
/** CI et Vercel définissent ces variables : un échec y est bloquant. */
const STRICT = Boolean(process.env.CI || process.env.VERCEL);

async function getArchive(lang: Lang, refresh: boolean): Promise<Uint8Array | null> {
  const file = join(CACHE_DIR, ARCHIVES[lang]);
  if (!refresh && existsSync(file)) return new Uint8Array(readFileSync(file));
  try {
    console.log(`↓ ${ARCHIVES[lang]}`);
    const res = await fetch(`${RELEASE}/${ARCHIVES[lang]}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = new Uint8Array(await res.arrayBuffer());
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(file, data);
    return data;
  } catch (err) {
    console.warn(`⚠ Téléchargement impossible (${ARCHIVES[lang]}) : ${(err as Error).message}`);
    return existsSync(file) ? new Uint8Array(readFileSync(file)) : null;
  }
}

function extractPages(zip: Uint8Array, lang: Lang): TldrDoc[] {
  const files = unzipSync(zip, {
    filter: (f) => PLATFORMS.some((p) => f.name.startsWith(`${p}/`)) && f.name.endsWith('.md'),
  });
  const pages: TldrDoc[] = [];
  for (const [path, content] of Object.entries(files)) {
    const [platform, file] = path.split('/') as [Platform, string];
    const name = file.replace(/\.md$/, '');
    if (!SAFE_NAME.test(name)) continue;
    const doc = parseTldrPage(strFromU8(content), name, lang, platform);
    if (doc) pages.push(doc);
  }
  return pages;
}

async function main() {
  const refresh = process.argv.includes('--refresh');
  const all: TldrDoc[] = [];
  for (const lang of ['fr', 'en'] as const) {
    const zip = await getArchive(lang, refresh);
    if (zip) all.push(...extractPages(zip, lang));
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  const index = writeSet(OUT_DIR, pickPages(all));
  const english = writeSet(join(OUT_DIR, 'en'), pickPages(all.filter((d) => d.lang === 'en')));

  const fr = index.filter((e) => e.lang === 'fr').length;
  if (index.length === 0) {
    // En déploiement, publier le site sans ses 6 000 fiches serait une régression silencieuse
    if (STRICT) throw new Error('aucune page tldr générée');
    console.warn('⚠ Aucune page tldr : l’application fonctionnera avec les seules fiches détaillées.');
  } else {
    console.log(`✓ ${index.length} pages tldr (${fr} en français, ${index.length - fr} en anglais) → public/tldr/`);
    console.log(`✓ ${english.length} pages tldr en anglais → public/tldr/en/`);
  }
}

/** Écrit un jeu de fiches (index + pages) dans `dir`. */
function writeSet(dir: string, chosen: Map<string, TldrDoc>): TldrIndexEntry[] {
  mkdirSync(join(dir, 'pages'), { recursive: true });
  const index: TldrIndexEntry[] = [];
  for (const [name, doc] of [...chosen].sort(([a], [b]) => a.localeCompare(b))) {
    writeFileSync(join(dir, 'pages', `${name}.json`), JSON.stringify(doc));
    index.push({ name, summary: shortSummary(doc.summary), lang: doc.lang });
  }
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index));
  return index;
}

main().catch((err: unknown) => {
  // En local, ne jamais bloquer le build pour des données facultatives ; en CI ou sur Vercel, échouer
  console.warn('⚠ build-tldr :', err);
  if (STRICT) process.exit(1);
});
