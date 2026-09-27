import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useTr } from '../../i18n';

/** Réservé aux utilisateurs connectés ; sinon, redirige vers la connexion puis revient ici. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const tr = useTr();
  if (loading) return <p className="text-zinc-500">{tr('Chargement…', 'Loading…')}</p>;
  if (!user) return <Navigate to={`/connexion?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

/**
 * Destination après connexion : `?next=` si c'est un chemin interne, sinon /compte.
 * Les navigateurs ignorent tabulations et retours à la ligne et lisent `\` comme `/` :
 * `/\t/pirate.example` mène à un autre site. On résout donc l'adresse comme eux.
 */
export function safeNext(next: string | null): string {
  if (!next?.startsWith('/')) return '/compte';
  const base = 'https://linuxlens.invalid';
  try {
    const url = new URL(next, base);
    return url.origin === base ? url.pathname + url.search + url.hash : '/compte';
  } catch {
    return '/compte';
  }
}
