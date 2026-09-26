import type { ReactNode } from 'react';

/** Section de texte des pages d'information (confidentialité, mentions légales). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2 text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}
