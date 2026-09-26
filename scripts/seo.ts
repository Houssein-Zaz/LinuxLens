/** Pages publiques indexables (les pages de compte en sont exclues). */
export const STATIC_PATHS = ['/', '/explorer', '/ls', '/chmod', '/exercices', '/confidentialite', '/mentions-legales'];

/**
 * Balises d'aperçu qui exigent une adresse absolue (image, URL canonique).
 * Vides si l'adresse du site est inconnue : les autres balises Open Graph restent valables.
 */
export function absoluteMetaTags(site: string | null): string {
  if (!site) return '';
  return [
    `<meta property="og:url" content="${site}/" />`,
    `<meta property="og:image" content="${site}/og-image.png" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="LinuxLens : les commandes Linux, expliquées en français." />',
  ].join('\n    ');
}

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
  const rules = ['User-agent: *', 'Disallow: /compte', 'Disallow: /nouveau-mot-de-passe', 'Disallow: /admin'];
  if (site) rules.push('', `Sitemap: ${site}/sitemap.xml`);
  return rules.join('\n') + '\n';
}
