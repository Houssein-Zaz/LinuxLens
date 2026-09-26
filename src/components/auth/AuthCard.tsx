import type { ReactNode } from 'react';
import { DemoBanner } from './DemoBanner';

/** Carte centrée des pages de connexion, inscription, mot de passe. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md pt-4 sm:pt-10">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-sm text-zinc-600 dark:text-zinc-400">{footer}</div>}
      <DemoBanner className="mt-5" />
    </div>
  );
}
