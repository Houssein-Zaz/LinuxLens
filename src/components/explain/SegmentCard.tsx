import { Link } from 'react-router';
import { getCommand } from '../../lib/registry';
import type { Segment } from '../../types/parser';
import { DangerNote } from '../ui/DangerNote';
import type { ExplainedToken } from './TokenLine';
import { TOKEN_STYLE } from './tokenStyles';

interface Props {
  index: number;
  segment: Segment;
  items: ExplainedToken[];
  selectedKey: string | null;
  onSelect(key: string | null): void;
  /** Source de la fiche pour une commande sans fiche détaillée. */
  fallbackSource?: (command: string) => 'tldr' | undefined;
}

/** Explication détaillée d'un segment (une commande entre deux opérateurs). */
export function SegmentCard({ index, segment, items, selectedKey, onSelect, fallbackSource }: Props) {
  const rows = items.filter((i) => i.token.kind !== 'pipe' && i.token.kind !== 'chain');
  const docs = segment.commands.map((c) => getCommand(c)).filter((d) => d !== undefined);
  const unknown = segment.commands.filter((c) => !getCommand(c) && !fallbackSource?.(c));

  return (
    <section
      aria-labelledby={`segment-${index}`}
      className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <span className="grid size-6 place-items-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {index + 1}
        </span>
        <h2 id={`segment-${index}`} className="font-mono text-lg font-semibold">
          {segment.commands.join(' → ') || 'Redirection seule'}
        </h2>
        <div className="ml-auto flex gap-3 text-sm">
          {segment.commands.map((c) =>
            getCommand(c) || fallbackSource?.(c) ? (
              <Link key={c} to={`/commande/${encodeURIComponent(c)}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                Fiche {c} →
              </Link>
            ) : null,
          )}
        </div>
      </header>

      {docs.map(
        (doc) =>
          doc.dangerLevel &&
          doc.dangerLevel !== 'safe' &&
          doc.dangerNote && <DangerNote key={doc.name} level={doc.dangerLevel} note={doc.dangerNote} className="mx-5 mt-4" />,
      )}

      {unknown.length > 0 && (
        <p className="mx-5 mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
          Aucune fiche pour <span className="font-mono">{unknown.join(', ')}</span>. Le découpage ci-dessous
          (commande, options, arguments) est déduit de la syntaxe du shell, sans explication spécifique.
        </p>
      )}

      <ul className="divide-y divide-zinc-100 px-2 py-2 dark:divide-zinc-800">
        {rows.map(({ key, token, explanation }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSelect(selectedKey === key ? null : key)}
              aria-pressed={selectedKey === key}
              className={`grid w-full gap-2 rounded-lg sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-4 px-3 py-3 text-left transition-colors ${
                selectedKey === key ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="min-w-0">
                <span className={`inline-block max-w-full truncate rounded-md px-1.5 py-0.5 font-mono text-sm ring-1 ring-inset ${TOKEN_STYLE[token.kind]}`}>
                  {token.kind === 'option' && token.groupedFrom ? token.value : token.raw}
                </span>
              </span>
              <span className="min-w-0 text-sm">
                <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {explanation.kindLabel}
                </span>
                <span className={`mt-0.5 block ${explanation.known ? '' : 'text-zinc-500 dark:text-zinc-400'}`}>{explanation.text}</span>
                {explanation.detail && <span className="mt-1 block text-zinc-500 dark:text-zinc-400">{explanation.detail}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
