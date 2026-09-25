import { Link } from 'react-router';
import { PageHeader } from '../components/ui/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page introuvable">
        <span className="font-mono text-sm">bash: cd: cette page: Aucun fichier ou dossier de ce type</span>
      </PageHeader>
      <Link to="/" className="text-indigo-600 hover:underline dark:text-indigo-400">
        Retour à l’accueil
      </Link>
    </>
  );
}
