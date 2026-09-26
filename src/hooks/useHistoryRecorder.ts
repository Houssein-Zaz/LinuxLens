import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

export const HISTORY_DELAY_MS = 2000;

/**
 * Enregistre la commande expliquée dans l'historique du compte, une fois la saisie
 * stabilisée (pas à chaque touche). Ne fait rien sans compte ou si la commande est invalide.
 */
export function useHistoryRecorder(command: string, valid: boolean) {
  const { backend, user } = useAuth();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const value = command.trim();
    if (!user || !valid || !value || value === last.current) return;
    const timer = setTimeout(() => {
      last.current = value;
      void backend.data.addHistory(value).catch(() => undefined);
    }, HISTORY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [command, valid, user, backend]);
}
