import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';

/** Commandes favorites de l'utilisateur connecté (liste vide sans compte). */
export function useFavorites() {
  const { backend, user } = useAuth();
  const userId = user?.id;
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites([]);
    if (!userId) return;
    let alive = true;
    backend.data
      .getFavorites()
      .then((f) => alive && setFavorites(f))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId, backend]);

  const toggle = useCallback(
    (command: string) => {
      if (!userId) return;
      const on = !favorites.includes(command);
      setFavorites(on ? [command, ...favorites] : favorites.filter((c) => c !== command));
      void backend.data.setFavorite(command, on).catch(() => {
        // échec : on revient à l'état précédent
        setFavorites((cur) => (on ? cur.filter((c) => c !== command) : [command, ...cur]));
      });
    },
    [favorites, userId, backend],
  );

  return { favorites, isFavorite: (c: string) => favorites.includes(c), toggle, enabled: Boolean(userId) };
}
