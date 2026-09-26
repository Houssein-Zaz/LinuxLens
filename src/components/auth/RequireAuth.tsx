import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

/** Réservé aux utilisateurs connectés ; sinon, redirige vers la connexion puis revient ici. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="text-zinc-500">Chargement…</p>;
  if (!user) return <Navigate to={`/connexion?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

/** Destination après connexion : `?next=` si c'est un chemin interne, sinon /compte. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/compte';
}
