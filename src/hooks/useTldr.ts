import { useEffect, useState } from 'react';
import type { TldrDoc, TldrIndexEntry } from '../types/command';

/*
 * Les pages tldr sont générées par scripts/build-tldr.ts dans public/tldr/ :
 * - index.json : nom + résumé de chaque commande (chargé une seule fois) ;
 * - pages/<nom>.json : fiche complète, chargée à la demande.
 */

export type TldrIndex = ReadonlyMap<string, TldrIndexEntry>;

const EMPTY: TldrIndex = new Map();

/** En dev, un fichier absent renvoie la page HTML du SPA avec un statut 200. */
const isJson = (r: Response) => r.ok && (r.headers.get('content-type') ?? '').includes('json');
let indexPromise: Promise<TldrIndex> | null = null;
let indexValue: TldrIndex | null = null;

export function loadTldrIndex(): Promise<TldrIndex> {
  indexPromise ??= fetch('/tldr/index.json')
    .then((r) => (isJson(r) ? (r.json() as Promise<TldrIndexEntry[]>) : []))
    .then((entries) => {
      indexValue = new Map(entries.map((e) => [e.name, e]));
      return indexValue;
    })
    .catch(() => {
      // Pas de données tldr (script non lancé, hors ligne) : l'application fonctionne sans
      indexValue = EMPTY;
      return EMPTY;
    });
  return indexPromise;
}

/** Index tldr ; vide tant qu'il n'est pas chargé. */
export function useTldrIndex(): TldrIndex {
  const [index, setIndex] = useState<TldrIndex>(indexValue ?? EMPTY);
  useEffect(() => {
    let alive = true;
    void loadTldrIndex().then((i) => alive && setIndex(i));
    return () => {
      alive = false;
    };
  }, []);
  return index;
}

const pageCache = new Map<string, Promise<TldrDoc | null>>();

export function loadTldrPage(name: string): Promise<TldrDoc | null> {
  let p = pageCache.get(name);
  if (!p) {
    p = fetch(`/tldr/pages/${encodeURIComponent(name)}.json`)
      .then((r) => (isJson(r) ? (r.json() as Promise<TldrDoc>) : null))
      .catch(() => null);
    pageCache.set(name, p);
  }
  return p;
}

export type TldrPageState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; doc: TldrDoc };

export function useTldrPage(name: string | undefined, enabled = true): TldrPageState {
  const [state, setState] = useState<TldrPageState>({ status: 'loading' });
  useEffect(() => {
    if (!name || !enabled) {
      setState({ status: 'missing' });
      return;
    }
    let alive = true;
    setState({ status: 'loading' });
    void loadTldrPage(name).then((doc) => alive && setState(doc ? { status: 'ready', doc } : { status: 'missing' }));
    return () => {
      alive = false;
    };
  }, [name, enabled]);
  return state;
}
