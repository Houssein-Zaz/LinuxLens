import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './hooks/useAuth';
import { createDemoBackend, type KeyValueStore } from './lib/backend/demo';
import type { Backend } from './types/backend';

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

/** Backend démo isolé, éventuellement avec un utilisateur déjà connecté. */
export async function testBackend(signedIn = false): Promise<Backend> {
  const backend = createDemoBackend(memoryStore());
  if (signedIn) await backend.auth.signUp('sara@exemple.fr', 'motdepasse1', 'Sara');
  return backend;
}

/**
 * Rend un élément avec le routeur et l'authentification.
 * `routes` : chemins supplémentaires pour vérifier une redirection.
 */
export function renderWithProviders(
  ui: ReactElement,
  { url = '/', path = '*', backend = createDemoBackend(memoryStore()), routes = {} }: {
    url?: string;
    path?: string;
    backend?: Backend;
    routes?: Record<string, ReactElement>;
  } = {},
) {
  const result = render(
    <AuthProvider backend={backend}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={ui} />
          {Object.entries(routes).map(([p, el]) => (
            <Route key={p} path={p} element={el} />
          ))}
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
  return { ...result, backend };
}
