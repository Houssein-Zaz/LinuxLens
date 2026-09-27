import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/*
 * Deux langues : français (par défaut) et anglais.
 * - Les composants appellent `useLang()` / `useTr()`, ce qui les fait se redessiner au changement de langue.
 * - Le code hors React (explications, correction des exercices…) lit la langue courante avec `tr()`.
 */

export type Lang = 'fr' | 'en';

export const LANGS: Lang[] = ['fr', 'en'];
const STORAGE_KEY = 'linuxlens-lang';

/** Choix enregistré, sinon langue du navigateur : français pour un navigateur en français, anglais sinon. */
export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch {
    // stockage indisponible
  }
  const nav = typeof navigator === 'undefined' ? 'fr' : (navigator.languages?.[0] ?? navigator.language ?? 'fr');
  return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

let current: Lang = 'fr';

/** Langue courante, pour le code hors React. */
export const getLang = (): Lang => current;

/** Change la langue courante du code hors React (le fournisseur s'en charge). */
export function setCurrentLang(lang: Lang) {
  current = lang;
}

/** Texte dans la langue courante. */
export const tr = (fr: string, en: string): string => (current === 'en' ? en : fr);

/**
 * Table de libellés qui suit la langue courante : `labels({ a: ['Oui', 'Yes'] }).a`.
 * Les lectures passent par des accesseurs, les tables s'utilisent donc comme des objets ordinaires.
 */
export function labels<K extends PropertyKey>(pairs: Record<K, readonly [string, string]>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(pairs) as K[]) {
    const [fr, en] = pairs[key];
    Object.defineProperty(out, key, { get: () => tr(fr, en), enumerable: true });
  }
  return out;
}

/**
 * Ajoute la traduction anglaise à un objet de données écrit en français :
 * chaque champ traduit devient un accesseur qui suit la langue courante.
 */
export function withEnglish<T extends object>(target: T, en: Partial<Record<keyof T, unknown>> | undefined): T {
  if (!en) return target;
  for (const key of Object.keys(en) as Array<keyof T>) {
    const fr = target[key];
    const english = en[key];
    Object.defineProperty(target, key, { get: () => (current === 'en' ? english : fr), enumerable: true, configurable: true });
  }
  return target;
}

interface LangContextValue {
  lang: Lang;
  setLang(lang: Lang): void;
}

const LangContext = createContext<LangContextValue | null>(null);

/**
 * `loadContent` : charge ce qui existe en anglais hors du bundle principal (les fiches de commandes) ;
 * renvoie `true` si du contenu vient d'être chargé.
 * Au changement de langue, le site bascule une fois le contenu arrivé ; au démarrage en anglais, les pages
 * s'affichent tout de suite puis sont redessinées quand les fiches anglaises sont là.
 */
export function LanguageProvider({
  children,
  initial,
  loadContent,
}: {
  children: ReactNode;
  initial?: Lang;
  loadContent?: (lang: Lang) => Promise<boolean>;
}) {
  const [lang, setLangState] = useState<Lang>(() => initial ?? initialLang());
  // Incrémenté quand le contenu arrive après le premier affichage : les pages sont alors recréées
  const [contentVersion, setContentVersion] = useState(0);
  // Avant le rendu des enfants : le code hors React doit déjà voir la bonne langue
  setCurrentLang(lang);

  const setLang = useCallback(
    (next: Lang) => {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // stockage indisponible : le choix vaut pour cette visite
      }
      const apply = () => {
        setCurrentLang(next);
        setLangState(next);
      };
      // En cas d'échec (hors ligne), on bascule quand même : les fiches restent en français
      if (loadContent) void loadContent(next).then(apply, apply);
      else apply();
    },
    [loadContent],
  );

  // Démarrage directement en anglais
  const [initialLangValue] = useState(lang);
  useEffect(() => {
    if (!loadContent) return;
    let alive = true;
    void loadContent(initialLangValue)
      .then((loaded) => alive && loaded && setContentVersion((v) => v + 1))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [loadContent, initialLangValue]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return (
    <LangContext.Provider value={value}>
      <Fragment key={contentVersion}>{children}</Fragment>
    </LangContext.Provider>
  );
}

/** Langue courante ; sans fournisseur (tests de composants isolés), la langue globale. */
export function useLang(): Lang {
  return useContext(LangContext)?.lang ?? current;
}

export function useSetLang(): (lang: Lang) => void {
  return useContext(LangContext)?.setLang ?? setCurrentLang;
}

/** `tr` lié à la langue du composant, qui se redessine quand elle change. */
export function useTr(): (fr: string, en: string) => string {
  const lang = useLang();
  return useCallback((fr: string, en: string) => (lang === 'en' ? en : fr), [lang]);
}
