import { Fragment, useId } from 'react';
import type { Explanation } from '../../lib/explain';
import type { Token } from '../../types/parser';
import { TOKEN_STYLE } from './tokenStyles';

export interface ExplainedToken {
  key: string;
  token: Token;
  explanation: Explanation;
}

interface Props {
  input: string;
  items: ExplainedToken[];
  selectedKey: string | null;
  onSelect(key: string | null): void;
}

/** La ligne de commande, chaque token coloré avec son explication au survol, au focus ou au clic. */
export function TokenLine({ input, items, selectedKey, onSelect }: Props) {
  let cursor = 0;
  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-base leading-loose shadow-sm sm:p-6 sm:text-lg dark:border-zinc-800 dark:bg-zinc-900"
      aria-label="Commande découpée en éléments"
    >
      <div className="flex flex-wrap items-center gap-y-2">
        {items.map((item) => {
          const gap = input.slice(cursor, item.token.start);
          cursor = Math.max(cursor, item.token.end);
          return (
            <Fragment key={item.key}>
              {gap && <span className="whitespace-pre">{gap}</span>}
              <TokenChip item={item} selected={selectedKey === item.key} onSelect={onSelect} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function TokenChip({
  item,
  selected,
  onSelect,
}: {
  item: ExplainedToken;
  selected: boolean;
  onSelect(key: string | null): void;
}) {
  const tooltipId = useId();
  const { token, explanation } = item;
  // Options groupées (-la) : le premier caractère porte le tiret, les suivants sont collés
  const joinedLeft = token.groupedFrom !== undefined && !token.raw.startsWith('-');

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-pressed={selected}
        onClick={() => onSelect(selected ? null : item.key)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onSelect(null);
            e.currentTarget.blur();
          }
        }}
        className={`whitespace-pre px-1.5 py-0.5 ring-1 transition-shadow ring-inset ${TOKEN_STYLE[token.kind]} ${
          joinedLeft ? 'rounded-r-md rounded-l-none' : token.groupedFrom ? 'rounded-l-md rounded-r-none' : 'rounded-md'
        } ${selected ? 'shadow-[0_0_0_2px] shadow-indigo-500' : 'hover:shadow-[0_0_0_2px] hover:shadow-indigo-300 dark:hover:shadow-indigo-500/50'} ${
          explanation.known ? '' : 'underline decoration-dotted decoration-1 underline-offset-4'
        }`}
      >
        {token.raw}
      </button>
      <span
        role="tooltip"
        id={tooltipId}
        className={`pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 max-w-[80vw] rounded-xl border border-zinc-200 bg-white p-3 font-sans text-sm leading-snug text-zinc-700 shadow-lg transition-opacity duration-150 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 ${
          selected ? 'visible opacity-100' : 'invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'
        }`}
      >
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {explanation.kindLabel}
        </span>
        <span className="block">{explanation.text}</span>
        {explanation.detail && <span className="mt-1.5 block text-zinc-500 dark:text-zinc-400">{explanation.detail}</span>}
      </span>
    </span>
  );
}
