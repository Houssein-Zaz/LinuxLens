import { Link } from 'react-router';
import { useTr } from '../../i18n';

const linkClass = 'underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100';

export function Footer() {
  const tr = useTr();
  return (
    <footer className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-zinc-500 sm:px-6 dark:text-zinc-400">
      LinuxLens. {tr('Fiches étendues :', 'Extended pages:')}{' '}
      <a className={linkClass} href="https://github.com/tldr-pages/tldr">
        tldr-pages
      </a>{' '}
      (
      <a className={linkClass} href="https://github.com/tldr-pages/tldr/blob/main/LICENSE.md">
        CC BY 4.0
      </a>
      ).{' '}
      <Link className={linkClass} to="/confidentialite">
        {tr('Confidentialité', 'Privacy')}
      </Link>
      {' · '}
      <Link className={linkClass} to="/mentions-legales">
        {tr('Mentions légales', 'Legal notice')}
      </Link>
    </footer>
  );
}
