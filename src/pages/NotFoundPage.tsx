import { Link } from 'react-router';
import { PageHeader } from '../components/ui/PageHeader';
import { useTr } from '../i18n';

export function NotFoundPage() {
  const tr = useTr();
  return (
    <>
      <PageHeader title={tr('Page introuvable', 'Page not found')}>
        <span className="font-mono text-sm">
          {tr('bash: cd: cette page: Aucun fichier ou dossier de ce type', 'bash: cd: this page: No such file or directory')}
        </span>
      </PageHeader>
      <Link to="/" className="text-indigo-600 hover:underline dark:text-indigo-400">
        {tr('Retour à l’accueil', 'Back to home')}
      </Link>
    </>
  );
}
