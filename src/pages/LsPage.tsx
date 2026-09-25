import { Fragment, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PageHeader } from '../components/ui/PageHeader';
import { FILE_TYPES, parseLsOutput } from '../lib/lsl';
import type { LslEntry, LslFieldKind } from '../types/lsl';

const DEFAULT = '-rw-rw-r-- 1 esprit esprit 47 juil. 12 21:14 fichier1';

const SAMPLES = [
  DEFAULT,
  'drwxr-xr-x 5 esprit esprit 4096 Jul 12 21:10 projets',
  'lrwxrwxrwx 1 root root 7 avril 22 2024 bin -> usr/bin',
  '-rwsr-xr-x 1 root root 68208 Feb 6 2024 /usr/bin/passwd',
  'drwxrwxrwt 18 root root 4096 12 sept. 10:00 tmp',
];

const FIELD_STYLE: Record<LslFieldKind, string> = {
  inode: 'bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:ring-zinc-600',
  type: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/30',
  'perm-owner': 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-400/15 dark:text-indigo-300 dark:ring-indigo-400/30',
  'perm-group': 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-sky-400/30',
  'perm-others': 'bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-400/15 dark:text-teal-300 dark:ring-teal-400/30',
  'perm-extra': 'bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:ring-zinc-600',
  links: 'bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:ring-zinc-600',
  owner: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-400/15 dark:text-indigo-300 dark:ring-indigo-400/30',
  group: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-sky-400/30',
  size: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/30',
  date: 'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-400/15 dark:text-orange-300 dark:ring-orange-400/30',
  name: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/30',
  arrow: 'bg-transparent text-zinc-500 ring-transparent dark:text-zinc-400',
  target: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/30',
};

export function LsPage() {
  const [params, setParams] = useSearchParams();
  const text = params.get('l') ?? DEFAULT;
  const inputId = useId();
  const lines = useMemo(() => parseLsOutput(text), [text]);
  const setText = (value: string) => setParams(value === DEFAULT ? {} : { l: value }, { replace: true });

  return (
    <>
      <PageHeader title="Analyseur de sortie ls -l">
        Collez une ou plusieurs lignes produites par <code className="font-mono">ls -l</code> : chaque bloc est surligné
        et expliqué.
      </PageHeader>

      <label htmlFor={inputId} className="mb-2 block text-sm font-medium">
        Sortie de ls -l
      </label>
      <textarea
        id={inputId}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(8, Math.max(2, text.split('\n').length + 1))}
        spellCheck={false}
        className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 font-mono text-sm shadow-sm outline-none transition-shadow focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-indigo-500"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Exemples :</span>
        {SAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setText(s)}
            className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
          >
            {FILE_TYPES[s[0] as keyof typeof FILE_TYPES].label}
            {s.includes('rws') ? ' setuid' : s.includes('rwt') ? ' + sticky' : ''}
          </button>
        ))}
      </div>

      <div className="mt-10 space-y-10">
        {lines.map((l, i) =>
          l.type === 'entry' ? (
            <EntryView key={i} entry={l} />
          ) : l.type === 'total' ? (
            <p key={i} className="rounded-xl bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-800/60">
              <code className="font-mono">{l.line}</code> — {l.explanation}
            </p>
          ) : (
            <div key={i} role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              <code className="block truncate font-mono">{l.line}</code>
              <span className="mt-1 block">{l.message}</span>
            </div>
          ),
        )}
      </div>
    </>
  );
}

function EntryView({ entry }: { entry: LslEntry }) {
  const [active, setActive] = useState<number | null>(null);
  let cursor = 0;

  return (
    <section aria-label={`Analyse de ${entry.name}`} className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex w-max items-center font-mono text-sm leading-loose sm:text-base">
          {entry.fields.map((f, i) => {
            const gap = entry.line.slice(cursor, f.start);
            cursor = f.end;
            return (
              <Fragment key={i}>
                {gap && <span className="whitespace-pre">{gap}</span>}
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${f.label} : ${f.raw}`}
                  className={`whitespace-pre rounded px-1 py-0.5 ring-1 ring-inset transition-shadow ${FIELD_STYLE[f.kind]} ${
                    active === i ? 'shadow-[0_0_0_2px] shadow-indigo-500' : ''
                  }`}
                >
                  {f.raw}
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <ol className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {entry.fields.map((f, i) => (
            <li
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className={`grid grid-cols-[minmax(0,8rem)_1fr] gap-4 px-4 py-3 transition-colors sm:grid-cols-[minmax(0,10rem)_1fr] ${
                active === i ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''
              }`}
            >
              <span className="min-w-0">
                <span className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 font-mono text-sm ring-1 ring-inset ${FIELD_STYLE[f.kind]}`}>
                  {f.raw}
                </span>
              </span>
              <span className="min-w-0 text-sm">
                <span className="block font-medium">{f.label}</span>
                <span className="text-zinc-600 dark:text-zinc-400">{f.explanation}</span>
              </span>
            </li>
          ))}
        </ol>

        <aside className="h-fit space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Équivalent octal</div>
            <div className="mt-1 font-mono text-4xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400">{entry.octal}</div>
            <div className="mt-1 font-mono text-sm text-zinc-500 dark:text-zinc-400">{entry.symbolic}</div>
          </div>
          <OctalBreakdown symbolic={entry.symbolic} />
          <div className="rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm dark:bg-zinc-950">
            chmod {entry.octal} {entry.name.includes(' ') ? `"${entry.name}"` : entry.name}
          </div>
          <Link
            to={`/chmod?mode=${entry.octal}`}
            className="block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Ouvrir dans le calculateur →
          </Link>
        </aside>
      </div>
    </section>
  );
}

/** rw- rw- r-- → 4+2+0 = 6, … */
function OctalBreakdown({ symbolic }: { symbolic: string }) {
  const parts = [0, 1, 2].map((k) => symbolic.slice(k * 3, k * 3 + 3));
  const labels = ['Propr.', 'Groupe', 'Autres'];
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Calcul de la notation octale</caption>
      <tbody>
        {parts.map((p, k) => {
          const values = [p[0] === 'r' ? 4 : 0, p[1] === 'w' ? 2 : 0, /[xst]/.test(p[2]!) ? 1 : 0];
          return (
            <tr key={k}>
              <th scope="row" className="py-0.5 text-left font-normal text-zinc-500 dark:text-zinc-400">
                {labels[k]}
              </th>
              <td className="font-mono">{p}</td>
              <td className="font-mono text-zinc-500 dark:text-zinc-400">{values.join('+')}</td>
              <td className="text-right font-mono font-semibold">{values.reduce((a, b) => a + b, 0)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
