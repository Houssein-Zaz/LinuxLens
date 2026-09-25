import type { TldrDoc } from '../src/types/command';

export type Lang = 'fr' | 'en';
export type Platform = 'common' | 'linux';

/** Noms utilisables tels quels comme nom de fichier et dans une URL. */
export const SAFE_NAME = /^[a-z0-9][a-z0-9._+-]*$/i;

/**
 * Transforme la syntaxe tldr en commande lisible :
 * `{{[-C|--directory]}}` → `-C` (forme courte), `{{chemin/vers/fichier}}` → `chemin/vers/fichier`.
 */
export function cleanCommand(command: string): string {
  return command
    .replace(/\{\{\[([^|\]]+)\|[^\]]+\]\}\}/g, '$1')
    .replace(/\{\{(.*?)\}\}/g, '$1')
    .replace(/\\\{\\\{/g, '{{')
    .replace(/\\\}\\\}/g, '}}');
}

export function sourceUrl(name: string, lang: Lang, platform: Platform): string {
  const dir = lang === 'en' ? 'pages' : `pages.${lang}`;
  return `https://github.com/tldr-pages/tldr/blob/main/${dir}/${platform}/${name}.md`;
}

/** Convertit une page tldr (Markdown) en fiche JSON. Renvoie `null` si la page est inexploitable. */
export function parseTldrPage(markdown: string, name: string, lang: Lang, platform: Platform): TldrDoc | null {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const summaryLines: string[] = [];
  let moreInfoUrl: string | undefined;
  const examples: TldrDoc['examples'] = [];
  let pending: string | null = null;

  for (const line of lines) {
    if (line.startsWith('> ')) {
      const text = line.slice(2).trim();
      const url = /<(https?:\/\/[^>]+)>/.exec(text);
      // « Plus d'informations : <url>. » / « More information: <url>. »
      if (url && /informations?|information/i.test(text)) moreInfoUrl = url[1];
      else summaryLines.push(text.replace(/`/g, ''));
    } else if (line.startsWith('- ')) {
      pending = line.slice(2).trim().replace(/\s*:$/, '').replace(/`/g, '');
    } else if (/^`.*`$/.test(line.trim()) && pending !== null) {
      examples.push({ description: pending, command: cleanCommand(line.trim().slice(1, -1)) });
      pending = null;
    }
  }

  if (summaryLines.length === 0 || examples.length === 0) return null;
  return {
    name,
    summary: summaryLines.join(' '),
    examples,
    lang,
    platform,
    sourceUrl: sourceUrl(name, lang, platform),
    ...(moreInfoUrl && { moreInfoUrl }),
  };
}

/** Première phrase du résumé, pour l'index (léger) et l'autocomplétion. */
export function shortSummary(summary: string): string {
  const first = /^(.+?[.!?])(\s|$)/.exec(summary);
  return (first?.[1] ?? summary).slice(0, 160);
}

/**
 * Choisit une page par commande : français d'abord, puis anglais ;
 * à langue égale, la page Linux l'emporte sur la page commune.
 */
export function pickPages(pages: TldrDoc[]): Map<string, TldrDoc> {
  const rank = (d: TldrDoc) => (d.lang === 'fr' ? 0 : 2) + (d.platform === 'linux' ? 0 : 1);
  const best = new Map<string, TldrDoc>();
  for (const page of pages) {
    const current = best.get(page.name);
    if (!current || rank(page) < rank(current)) best.set(page.name, page);
  }
  return best;
}
