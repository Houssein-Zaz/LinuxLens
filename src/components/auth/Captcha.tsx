import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/*
 * Vérification anti-robot Cloudflare Turnstile, exigée par Supabase quand la protection
 * « CAPTCHA » est activée (inscription, connexion, mot de passe oublié).
 * Sans VITE_TURNSTILE_SITE_KEY, rien n'est affiché ni chargé : la protection doit alors
 * être désactivée côté Supabase.
 */

export const TURNSTILE_SITE_KEY: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY || undefined;

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface Turnstile {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      theme?: 'auto' | 'light' | 'dark';
      callback(token: string): void;
      'expired-callback'(): void;
      'error-callback'(): void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<Turnstile> | null = null;

/** Charge le script une seule fois pour tout le site ; un échec permet de réessayer plus tard. */
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile indisponible')));
    script.onerror = () => {
      script.remove();
      loading = null;
      reject(new Error('Turnstile indisponible'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export interface Captcha {
  /** Le widget à placer dans le formulaire (null sans clé de site). */
  element: ReactNode;
  /** Jeton à transmettre à Supabase ; à usage unique. */
  token: string | undefined;
  /** Vrai quand le formulaire peut être envoyé. */
  ready: boolean;
  /** À appeler après un envoi refusé : le jeton déjà utilisé n'est plus valable. */
  reset(): void;
}

export function useCaptcha(siteKey: string | undefined = TURNSTILE_SITE_KEY): Captcha {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !container.current) return;
        widgetId.current = turnstile.render(container.current, {
          sitekey: siteKey,
          language: 'fr',
          theme: 'auto',
          callback: setToken,
          'expired-callback': () => setToken(undefined),
          'error-callback': () => setToken(undefined),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  const reset = useCallback(() => {
    setToken(undefined);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  const element = siteKey ? (
    <div>
      <div ref={container} data-testid="captcha" className="min-h-[65px]" />
      {failed && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          La vérification anti-robot n’a pas pu se charger. Désactivez un éventuel bloqueur de contenu, puis rechargez la page.
        </p>
      )}
    </div>
  ) : null;

  return { element, token, ready: !siteKey || Boolean(token), reset };
}
