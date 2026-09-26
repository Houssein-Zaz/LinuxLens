import { Link } from 'react-router';

const linkClass = 'underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100';

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-zinc-500 sm:px-6 dark:text-zinc-400">
      LinuxLens. Fiches étendues :{' '}
      <a className={linkClass} href="https://github.com/tldr-pages/tldr">
        tldr-pages
      </a>{' '}
      (
      <a className={linkClass} href="https://github.com/tldr-pages/tldr/blob/main/LICENSE.md">
        CC BY 4.0
      </a>
      ).{' '}
      <Link className={linkClass} to="/confidentialite">
        Confidentialité
      </Link>
    </footer>
  );
}
