import { useCallback, useState } from 'react';

const KEY = 'linuxlens-progress';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function save(ids: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    // stockage indisponible : la progression reste valable pour la session
  }
}

/** Exercices réussis, mémorisés dans ce navigateur. */
export function useProgress() {
  const [solved, setSolved] = useState<Set<string>>(load);

  const markSolved = useCallback((id: string) => {
    setSolved((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const empty = new Set<string>();
    save(empty);
    setSolved(empty);
  }, []);

  return { solved, markSolved, reset };
}
