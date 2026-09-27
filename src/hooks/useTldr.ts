import { useEffect, useState } from 'react';
import type { TldrDoc, TldrIndexEntry } from '../types/command';
import { useLang, type Lang } from '../i18n';

/*
 * Les pages tldr sont générées par scripts/build-tldr.ts dans public/tldr/ (français, sinon anglais)
 * et public/tldr/en/ (anglais) :
 * - index.json : nom + résumé de chaque commande (chargé une seule fois par langue) ;
 * - pages/<nom>.json : fiche complète, chargée à la demande.
 */

const base = (lang: Lang) => (lang === 'en' ? '/tldr/en' : '/tldr');

export type TldrIndex = ReadonlyMap<string, TldrIndexEntry>;

const EMPTY: TldrIndex = new Map();

/** En dev, un fichier absent renvoie la page HTML du SPA avec un statut 200. */
const isJson = (r: Response) => r.ok && (r.headers.get('content-type') ?? '').includes('json');
const indexPromise = new Map<Lang, Promise<TldrIndex>>();
const indexValue = new Map<Lang, TldrIndex>();

export function loadTldrIndex(lang: Lang = 'fr'): Promise<TldrIndex> {
  let p = indexPromise.get(lang);
  if (!p) {
    p = fetch(`${base(lang)}/index.json`)
      .then((r) => (isJson(r) ? (r.json() as Promise<TldrIndexEntry[]>) : []))
      .then((entries) => {
        const index: TldrIndex = new Map(entries.map((e) => [e.name, e]));
        indexValue.set(lang, index);
        return index;
      })
      .catch(() => {
        // Pas de données tldr (script non lancé, hors ligne) : l'application fonctionne sans
        indexValue.set(lang, EMPTY);
        return EMPTY;
      });
    indexPromise.set(lang, p);
  }
  return p;
}

/** Index tldr dans la langue courante ; vide tant qu'il n'est pas chargé. */
export function useTldrIndex(): TldrIndex {
  const lang = useLang();
  const [index, setIndex] = useState<TldrIndex>(indexValue.get(lang) ?? EMPTY);
  useEffect(() => {
    let alive = true;
    setIndex(indexValue.get(lang) ?? EMPTY);
    void loadTldrIndex(lang).then((i) => alive && setIndex(i));
    return () => {
      alive = false;
    };
  }, [lang]);
  return index;
}

const pageCache = new Map<string, Promise<TldrDoc | null>>();

export function loadTldrPage(name: string, lang: Lang = 'fr'): Promise<TldrDoc | null> {
  const key = `${lang}:${name}`;
  let p = pageCache.get(key);
  if (!p) {
    p = fetch(`${base(lang)}/pages/${encodeURIComponent(name)}.json`)
      .then((r) => (isJson(r) ? (r.json() as Promise<TldrDoc>) : null))
      .catch(() => null);
    pageCache.set(key, p);
  }
  return p;
}

export type TldrPageState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; doc: TldrDoc };

export function useTldrPage(name: string | undefined, enabled = true): TldrPageState {
  const lang = useLang();
  const [state, setState] = useState<TldrPageState>({ status: 'loading' });
  useEffect(() => {
    if (!name || !enabled) {
      setState({ status: 'missing' });
      return;
    }
    let alive = true;
    setState({ status: 'loading' });
    void loadTldrPage(name, lang).then((doc) => alive && setState(doc ? { status: 'ready', doc } : { status: 'missing' }));
    return () => {
      alive = false;
    };
  }, [name, enabled, lang]);
  return state;
}
