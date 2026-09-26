/** Pages publiques indexables (les pages de compte en sont exclues). */
export const STATIC_PATHS = ['/', '/explorer', '/ls', '/chmod', '/exercices', '/confidentialite'];

/**
 * URL publique du site, sans barre finale : `SITE_URL` si défini, sinon le domaine de production
 * que Vercel fournit (`VERCEL_PROJECT_PRODUCTION_URL`, sans protocole). `null` si aucun n'est connu.
 */
export function siteUrl(env: Record<string, string | undefined>): string | null {
  const raw = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return raw ? raw.replace(/\/+$/, '') : null;
}

const escapeXml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

export function buildSitemap(site: string, commands: Iterable<string>): string {
  const paths = [...STATIC_PATHS, ...[...new Set(commands)].sort().map((c) => `/commande/${encodeURIComponent(c)}`)];
  const urls = paths.map((p) => `  <url><loc>${escapeXml(site + p)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobots(site: string | null): string {
  const rules = ['User-agent: *', 'Disallow: /compte', 'Disallow: /nouveau-mot-de-passe'];
  if (site) rules.push('', `Sitemap: ${site}/sitemap.xml`);
  return rules.join('\n') + '\n';
}
