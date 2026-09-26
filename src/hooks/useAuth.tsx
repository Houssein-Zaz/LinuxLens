import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createBackend } from '../lib/backend';
import type { Backend, User } from '../types/backend';

interface AuthState {
  backend: Backend;
  user: User | null;
  /** Vrai tant que la session n'a pas été lue (évite un clignotement « déconnecté »). */
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

let defaultBackend: Backend | null = null;
const getDefaultBackend = () => (defaultBackend ??= createBackend());

export function AuthProvider({ backend, children }: { backend?: Backend; children: ReactNode }) {
  const active = useMemo(() => backend ?? getDefaultBackend(), [backend]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void active.auth.getUser().then((u) => {
      if (!alive) return;
      setUser(u);
      setLoading(false);
    });
    const unsubscribe = active.auth.onChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [active]);

  const value = useMemo(() => ({ backend: active, user, loading }), [active, user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
