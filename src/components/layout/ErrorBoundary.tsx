import { Component, type ErrorInfo, type ReactNode } from 'react';
import { PageHeader } from '../ui/PageHeader';

/**
 * Affiche un message au lieu d'un écran blanc quand une page plante.
 * Le parent change `key` à chaque navigation pour effacer l'erreur.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur dans une page :', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    // Après un déploiement, les anciens fichiers JS n'existent plus : recharger récupère les nouveaux.
    const staleChunk = /dynamically imported module|Importing a module script failed/i.test(this.state.error.message);
    return (
      <>
        <PageHeader title="Une erreur est survenue">
          {staleChunk
            ? 'Une nouvelle version du site est disponible. Rechargez la page pour continuer.'
            : 'Cette page a rencontré un problème inattendu. Rechargez-la ou revenez à l’accueil.'}
        </PageHeader>
        <div className="flex gap-4 text-sm">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
          >
            Recharger la page
          </button>
          <a href="/" className="self-center text-indigo-600 hover:underline dark:text-indigo-400">
            Retour à l’accueil
          </a>
        </div>
      </>
    );
  }
}
