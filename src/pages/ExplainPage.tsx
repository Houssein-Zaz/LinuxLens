import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CommandInput, type Suggestion } from '../components/explain/CommandInput';
import { SegmentCard } from '../components/explain/SegmentCard';
import { TokenLine, type ExplainedToken } from '../components/explain/TokenLine';
import { LEGEND, TOKEN_STYLE } from '../components/explain/tokenStyles';
import { useTldrIndex } from '../hooks/useTldr';
import { useHistoryRecorder } from '../hooks/useHistoryRecorder';
import { CONTROL_TEXT, explainSegment } from '../lib/explain';
import { parseCommandLine } from '../lib/parser';
import { getCommand, registrySpec, suggestCommands } from '../lib/registry';
import type { ControlOperator } from '../types/parser';

const EXAMPLES = [
  'ls -la /home',
  'ps aux | grep nginx | wc -l',
  'tar -czvf projet.tar.gz projet/',
  'chmod u+x script.sh && ./script.sh',
  'find . -name "*.log" -mtime +7 -delete',
  'grep -rn "TODO" src/ > todo.txt 2>&1',
];

export function ExplainPage() {
  const [params, setParams] = useSearchParams();
  const input = params.get('c') ?? '';
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const tldr = useTldrIndex();

  const setInput = useCallback(
    (value: string) => {
      setSelectedKey(null);
      setParams(value ? { c: value } : {}, { replace: true });
    },
    [setParams],
  );

  const summaryFor = useCallback((cmd: string) => tldr.get(cmd)?.summary, [tldr]);

  const suggest = useCallback(
    (prefix: string): Suggestion[] =>
      suggestCommands(prefix, tldr.keys()).map((name) => ({
        name,
        summary: getCommand(name)?.summary ?? tldr.get(name)?.summary,
      })),
    [tldr],
  );

  const parsed = useMemo(() => parseCommandLine(input, registrySpec), [input]);
  const perSegment = useMemo(
    () =>
      parsed.segments.map((segment, s) => {
        const explanations = explainSegment(segment, { summaryFor });
        return segment.tokens.map((token, t): ExplainedToken => ({ key: `${s}-${t}`, token, explanation: explanations[t]! }));
      }),
    [parsed, summaryFor],
  );
  const allItems = perSegment.flat();
  useHistoryRecorder(input, allItems.length > 0 && parsed.errors.length === 0);

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-3xl space-y-3 pt-4 text-center sm:pt-10">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Comprendre une commande Linux</h1>
        <p className="text-zinc-600 text-balance dark:text-zinc-400">
          Tapez ou collez une commande : chaque élément est coloré et expliqué, en français.
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <CommandInput value={input} onChange={setInput} suggest={suggest} />
        {!input && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setInput(ex)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-xs text-zinc-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 sm:text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {parsed.errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          {parsed.errors.map((e) => (
            <li key={`${e.start}-${e.message}`}>
              {e.message} <span className="text-amber-700 dark:text-amber-300/80">(position {e.start + 1})</span>
            </li>
          ))}
        </ul>
      )}

      {allItems.length > 0 && (
        <>
          <div className="space-y-3">
            <TokenLine input={input} items={allItems} selectedKey={selectedKey} onSelect={setSelectedKey} />
            <ul aria-label="Légende" className="flex flex-wrap items-center gap-x-2 gap-y-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              {LEGEND.map(({ kind, label }) => (
                <li key={kind}>
                  <span className={`rounded px-1.5 py-0.5 ring-1 ring-inset ${TOKEN_STYLE[kind]}`}>{label}</span>
                </li>
              ))}
              <li className="ml-1">
                <span className="underline decoration-dotted underline-offset-4">souligné</span> = non documenté
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            {parsed.segments.map((segment, i) => (
              <div key={i} className="space-y-3">
                <SegmentCard
                  index={i}
                  segment={segment}
                  items={perSegment[i]!}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                  fallbackSource={(c) => (tldr.has(c) ? 'tldr' : undefined)}
                />
                {segment.next && <Connector op={segment.next} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Connector({ op }: { op: ControlOperator }) {
  return (
    <div className="flex items-center gap-3 pl-5 text-sm text-zinc-500 dark:text-zinc-400">
      <span aria-hidden="true" className="h-8 w-px bg-zinc-300 dark:bg-zinc-700" />
      <span className={`rounded-md px-1.5 py-0.5 font-mono ring-1 ring-inset ${TOKEN_STYLE[op === '|' || op === '|&' ? 'pipe' : 'chain']}`}>{op}</span>
      <span>{CONTROL_TEXT[op]}</span>
    </div>
  );
}
