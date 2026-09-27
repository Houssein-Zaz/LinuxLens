import { useId, useMemo, useRef, useState } from 'react';
import { parseCommandLine } from '../../lib/parser';
import { useTr } from '../../i18n';

export interface Suggestion {
  name: string;
  summary?: string;
}

interface Props {
  value: string;
  onChange(value: string): void;
  suggest(prefix: string): Suggestion[];
}

/** Mot en position de commande sous le curseur, s'il y en a un. */
function commandWordAt(value: string, caret: number) {
  const parsed = parseCommandLine(value.slice(0, caret));
  const last = parsed.segments.at(-1)?.tokens.at(-1);
  if (!last || last.kind !== 'command' || last.end !== caret) return null;
  return { start: last.start, end: caret, prefix: last.value };
}

export function CommandInput({ value, onChange, suggest }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [caret, setCaret] = useState(value.length);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const tr = useTr();

  const word = useMemo(() => commandWordAt(value, caret), [value, caret]);
  const suggestions = useMemo(() => {
    if (!word) return [];
    const list = suggest(word.prefix);
    // Inutile de proposer exactement ce qui est déjà tapé, seul
    return list.length === 1 && list[0]!.name === word.prefix ? [] : list;
  }, [word, suggest]);
  const expanded = open && suggestions.length > 0;

  const accept = (name: string) => {
    if (!word) return;
    const next = value.slice(0, word.start) + name + ' ' + value.slice(word.end).replace(/^ /, '');
    const pos = word.start + name.length + 1;
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 shadow-sm transition-shadow focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-indigo-500">
        <span aria-hidden="true" className="select-none font-mono text-lg text-indigo-500">
          $
        </span>
        <input
          ref={inputRef}
          value={value}
          role="combobox"
          aria-label={tr('Commande à expliquer', 'Command to explain')}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
          placeholder="ls -la | grep .txt"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          className="h-14 w-full min-w-0 bg-transparent font-mono text-base outline-none placeholder:text-zinc-400 sm:h-16 sm:text-lg dark:placeholder:text-zinc-500"
          onChange={(e) => {
            onChange(e.target.value);
            setCaret(e.target.selectionStart ?? e.target.value.length);
            setOpen(true);
            setActive(0);
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? value.length)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (!expanded) {
              if (e.key === 'ArrowDown' && suggestions.length) setOpen(true);
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => (a + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              accept(suggestions[active]!.name);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            {tr('Effacer', 'Clear')}
          </button>
        )}
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label={tr('Suggestions de commandes', 'Command suggestions')}
        className={`absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 ${
          expanded ? '' : 'hidden'
        }`}
      >
        {suggestions.map((s, i) => (
          <li
            key={s.name}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              accept(s.name);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex cursor-pointer items-baseline gap-3 px-4 py-2 ${i === active ? 'bg-indigo-50 dark:bg-indigo-500/15' : ''}`}
          >
            <span className="font-mono text-indigo-700 dark:text-indigo-300">{s.name}</span>
            {s.summary && <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">{s.summary}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
