import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';

const KEY = 'linuxlens-progress';

function loadLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveLocal(ids: Set<string>) {
  try {
    if (ids.size) localStorage.setItem(KEY, JSON.stringify([...ids]));
    else localStorage.removeItem(KEY);
  } catch {
    // stockage indisponible : la progression reste valable pour la session
  }
}

/**
 * Exercices réussis. Sans compte : mémorisés dans ce navigateur.
 * Avec un compte : enregistrés dans le compte ; à la connexion, la progression
 * faite hors connexion y est fusionnée, pour ne rien perdre.
 */
export function useProgress() {
  const { backend, user } = useAuth();
  const userId = user?.id;
  const [solved, setSolved] = useState<Set<string>>(loadLocal);

  useEffect(() => {
    if (!userId) {
      setSolved(loadLocal());
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const local = [...loadLocal()];
        if (local.length) {
          await backend.data.addProgress(local);
          saveLocal(new Set());
        }
        const remote = await backend.data.getProgress();
        if (alive) setSolved(new Set(remote));
      } catch {
        // base injoignable : on garde l'affichage courant
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, backend]);

  const markSolved = useCallback(
    (id: string) => {
      if (solved.has(id)) return;
      const next = new Set(solved).add(id);
      setSolved(next);
      if (userId) void backend.data.addProgress([id]).catch(() => undefined);
      else saveLocal(next);
    },
    [solved, userId, backend],
  );

  const reset = useCallback(() => {
    setSolved(new Set());
    if (userId) void backend.data.clearProgress().catch(() => undefined);
    else saveLocal(new Set());
  }, [userId, backend]);

  return { solved, markSolved, reset, synced: Boolean(userId) };
}
