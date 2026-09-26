/**
 * Génère public/robots.txt et public/sitemap.xml (fiches détaillées + pages tldr).
 * À lancer après build-tldr. Sans URL de site connue (SITE_URL ou Vercel), seul robots.txt est écrit.
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TldrIndexEntry } from '../src/types/command';
import { buildRobots, buildSitemap, siteUrl } from './seo';

const ROOT = join(import.meta.dirname, '..');
const PUBLIC = join(ROOT, 'public');

const detailed = readdirSync(join(ROOT, 'src', 'data', 'commands')).map((f) => f.replace(/\.json$/, ''));
const tldrIndex = join(PUBLIC, 'tldr', 'index.json');
const tldr = existsSync(tldrIndex) ? (JSON.parse(readFileSync(tldrIndex, 'utf8')) as TldrIndexEntry[]).map((e) => e.name) : [];

const site = siteUrl(process.env);
writeFileSync(join(PUBLIC, 'robots.txt'), buildRobots(site));
if (site) {
  writeFileSync(join(PUBLIC, 'sitemap.xml'), buildSitemap(site, [...detailed, ...tldr]));
  console.log(`✓ sitemap.xml (${site}) et robots.txt → public/`);
} else {
  rmSync(join(PUBLIC, 'sitemap.xml'), { force: true });
  console.warn('⚠ SITE_URL non défini : robots.txt généré sans sitemap.');
}
