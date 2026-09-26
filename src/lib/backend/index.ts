import type { AuthApi, Backend, DataApi } from '../../types/backend';
import { createDemoBackend } from './demo';

/**
 * Supabase si les variables d'environnement sont définies (.env.local ou réglages Vercel),
 * sinon le mode démo, qui garde tout dans le navigateur.
 */
export function createBackend(env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string } = import.meta.env): Backend {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (url && key) {
    return lazyBackend('supabase', async () => {
      const [{ createClient }, { createSupabaseBackend }] = await Promise.all([import('@supabase/supabase-js'), import('./supabase')]);
      return createSupabaseBackend(createClient(projectUrl(url), key));
    });
  }
  return createDemoBackend();
}

/**
 * Adresse de base du projet. Le tableau de bord affiche aussi `…supabase.co/rest/v1/` :
 * collée telle quelle, elle ferait échouer toutes les requêtes d'authentification.
 */
export function projectUrl(url: string): string {
  try {
    return new URL(url.trim()).origin;
  } catch {
    return url;
  }
}

/**
 * Backend chargé au premier appel : la bibliothèque Supabase (≈ 150 Ko) ne pèse pas
 * sur le premier affichage. Toutes les méthodes sont asynchrones, sauf `onChange`,
 * qui s'abonne dès que le chargement est terminé.
 */
export function lazyBackend(mode: Backend['mode'], load: () => Promise<Backend>): Backend {
  let loading: Promise<Backend> | null = null;
  const get = () => (loading ??= load());

  /** Chaque méthode attend le chargement puis appelle la vraie ; `own` remplace certaines méthodes. */
  const defer = <T extends object>(pick: (b: Backend) => T, own: Partial<T> = {}): T =>
    new Proxy(own as T, {
      get: (target, method) => {
        if (method in target) return target[method as keyof T];
        if (method === 'then' || typeof method === 'symbol') return undefined; // pas un « thenable »
        return (...args: unknown[]) => get().then((b) => (pick(b)[method as keyof T] as (...a: unknown[]) => unknown)(...args));
      },
    });

  const onChange: AuthApi['onChange'] = (listener) => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    void get().then((b) => {
      if (!cancelled) unsubscribe = b.auth.onChange(listener);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  };

  return { mode, auth: defer<AuthApi>((b) => b.auth, { onChange }), data: defer<DataApi>((b) => b.data) };
}
