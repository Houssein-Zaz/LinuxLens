import { absoluteMetaTags, buildRobots, buildSitemap, siteUrl } from './seo';

describe('siteUrl', () => {
  it('préfère SITE_URL et retire la barre finale', () => {
    expect(siteUrl({ SITE_URL: 'https://linuxlens.fr/', VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' })).toBe('https://linuxlens.fr');
  });

  it('se rabat sur le domaine de production Vercel', () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'linuxlens.vercel.app' })).toBe('https://linuxlens.vercel.app');
  });

  it('renvoie null sans configuration', () => {
    expect(siteUrl({})).toBeNull();
  });
});

describe('buildSitemap', () => {
  it('liste les pages publiques et chaque commande une seule fois', () => {
    const xml = buildSitemap('https://linuxlens.fr', ['tar', 'ls', 'tar', 'g++']);
    expect(xml).toContain('<loc>https://linuxlens.fr/</loc>');
    expect(xml).toContain('<loc>https://linuxlens.fr/chmod</loc>');
    expect(xml).toContain('<loc>https://linuxlens.fr/commande/g%2B%2B</loc>');
    expect(xml.match(/commande\/tar</g)).toHaveLength(1);
    expect(xml).not.toContain('/compte');
  });
});

describe('buildRobots', () => {
  it('pointe vers le sitemap quand le site est connu', () => {
    expect(buildRobots('https://linuxlens.fr')).toContain('Sitemap: https://linuxlens.fr/sitemap.xml');
    expect(buildRobots(null)).not.toContain('Sitemap');
  });
});

describe('absoluteMetaTags', () => {
  it('image d’aperçu en adresse absolue, rien sans adresse de site', () => {
    expect(absoluteMetaTags('https://linuxlens.fr')).toContain('<meta property="og:image" content="https://linuxlens.fr/og-image.png" />');
    expect(absoluteMetaTags(null)).toBe('');
  });
});
