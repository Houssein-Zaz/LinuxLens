import type { MonitoringApi } from '../types/backend';
import { defaultBackend } from './backend';

/*
 * Envoie les erreurs du site au journal consultable dans le tableau de bord admin.
 * Limité pour ne pas inonder la base : chaque message une seule fois, 20 au plus par visite.
 */

const MAX_REPORTS = 20;
/** Bruit sans intérêt : erreurs d'extensions ou de scripts tiers, avertissements du navigateur. */
const IGNORED = [/^Script error\.?$/, /ResizeObserver loop/];

let sent = new Set<string>();

export function reportError(source: string, error: unknown, monitoring: MonitoringApi = defaultBackend().monitoring): void {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (IGNORED.some((re) => re.test(message))) return;
  const key = `${source}|${message}`;
  if (sent.has(key) || sent.size >= MAX_REPORTS) return;
  sent.add(key);
  const detail = error instanceof Error ? (error.stack ?? '') : '';
  void monitoring.report({ source, message, detail });
}

/** Branche le signalement sur les erreurs non rattrapées. À appeler une fois, au démarrage. */
export function installErrorReporting(monitoring?: MonitoringApi): () => void {
  const onError = (e: ErrorEvent) => reportError('window', e.error ?? e.message, monitoring);
  const onRejection = (e: PromiseRejectionEvent) => reportError('promise', e.reason, monitoring);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

/** Pour les tests. */
export function resetErrorReporting(): void {
  sent = new Set();
}
