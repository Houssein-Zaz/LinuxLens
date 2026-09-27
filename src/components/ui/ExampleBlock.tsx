import type { ConcreteExample } from '../../lib/examples';
import { useTr } from '../../i18n';

/** Petit terminal : commande, sortie et contexte d'un exemple concret. */
export function ExampleBlock({ example, className = '' }: { example: ConcreteExample; className?: string }) {
  const tr = useTr();
  return (
    <figure className={`overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 ${className}`}>
      <figcaption className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
        {tr('Exemple', 'Example')}
      </figcaption>
      <div className="bg-zinc-900 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-100 sm:text-[13px]">
        <div className="overflow-x-auto whitespace-pre">
          <span className="select-none text-indigo-400">$ </span>
          {example.command}
        </div>
        {example.output && <div className="mt-1 overflow-x-auto whitespace-pre text-zinc-400">{example.output}</div>}
      </div>
      {example.caption && (
        <p className="bg-white px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">{example.caption}</p>
      )}
    </figure>
  );
}
