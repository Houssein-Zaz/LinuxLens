import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PageHeader } from '../components/ui/PageHeader';
import { CATEGORIES } from '../data/categories';
import { useTldrIndex } from '../hooks/useTldr';
import { allCommands } from '../lib/registry';
import { matchScore } from '../lib/search';
import type { CommandDoc } from '../types/command';

const MAX_TLDR_RESULTS = 60;

export function ExplorerPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const tldr = useTldrIndex();
  const commands = allCommands();

  const detailed = useMemo(
    () => commands.filter((c) => matchScore(query, c.name, c.summary) > 0),
    [commands, query],
  );

  const extended = useMemo(() => {
    if (!query.trim()) return [];
    return [...tldr.values()]
      .filter((e) => !commands.some((c) => c.name === e.name))
      .map((e) => ({ entry: e, score: matchScore(query, e.name, e.summary) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
      .slice(0, MAX_TLDR_RESULTS)
      .map((r) => r.entry);
  }, [tldr, commands, query]);

  const byCategory = CATEGORIES.map((cat) => ({ cat, items: detailed.filter((c) => c.category === cat.id) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <>
      <PageHeader title="Explorer les commandes" />

      <div className="relative mb-10 max-w-xl">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder="Rechercher : nom ou description (ex. « archive », « processus »)"
          aria-label="Rechercher une commande"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm shadow-sm outline-none transition-shadow focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-indigo-500"
        />
      </div>

      {byCategory.length === 0 && extended.length === 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">
          Aucune commande ne correspond à « {query} ».{' '}
          <Link className="text-indigo-600 hover:underline dark:text-indigo-400" to={`/?c=${encodeURIComponent(query)}`}>
            L’analyser quand même
          </Link>
        </p>
      )}

      <div className="space-y-10">
        {byCategory.map(({ cat, items }) => (
          <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
            <h2 id={`cat-${cat.id}`} className="text-lg font-semibold tracking-tight">
              {cat.label}
            </h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{cat.description}</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <li key={c.name}>
                  <CommandCard doc={c} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {extended.length > 0 && (
          <section aria-labelledby="cat-tldr">
            <h2 id="cat-tldr" className="text-lg font-semibold tracking-tight">
              Autres commandes
            </h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">Fiches courtes : un résumé et des exemples.</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {extended.map((e) => (
                <li key={e.name}>
                  <CardLink to={`/commande/${encodeURIComponent(e.name)}`} name={e.name} summary={e.summary} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

function CommandCard({ doc }: { doc: CommandDoc }) {
  return <CardLink to={`/commande/${encodeURIComponent(doc.name)}`} name={doc.name} summary={doc.summary} />;
}

function CardLink({ to, name, summary, badge }: { to: string; name: string; summary: string; badge?: string }) {
  return (
    <Link
      to={to}
      className="block h-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/60"
    >
      <span className="flex items-center gap-2">
        <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300">{name}</span>
        {badge && (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {badge}
          </span>
        )}
      </span>
      <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">{summary}</span>
    </Link>
  );
}
