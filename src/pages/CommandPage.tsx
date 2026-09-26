import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { DangerNote } from '../components/ui/DangerNote';
import { FavoriteButton } from '../components/auth/FavoriteButton';
import { DocumentTitle } from '../components/ui/DocumentTitle';
import { ExampleBlock } from '../components/ui/ExampleBlock';
import { PageHeader } from '../components/ui/PageHeader';
import { CATEGORY_BY_ID } from '../data/categories';
import { useTldrPage } from '../hooks/useTldr';
import { getCommand } from '../lib/registry';
import type { CommandDoc, TldrDoc } from '../types/command';

const TLDR_LICENSE = 'https://github.com/tldr-pages/tldr/blob/main/LICENSE.md';

export function CommandPage() {
  const { name = '' } = useParams();
  const doc = getCommand(name);
  const tldr = useTldrPage(name, !doc);

  if (doc) return <DetailedDoc doc={doc} />;
  if (tldr.status === 'loading') return <p className="text-zinc-500">Chargement…</p>;
  if (tldr.status === 'ready') return <TldrView doc={tldr.doc} />;

  return (
    <>
      <PageHeader title={name}>Aucune fiche n’existe pour cette commande.</PageHeader>
      <div className="flex gap-4 text-sm">
        <Link className="text-indigo-600 hover:underline dark:text-indigo-400" to={`/?c=${encodeURIComponent(name)}`}>
          Analyser « {name} » quand même
        </Link>
        <Link className="text-indigo-600 hover:underline dark:text-indigo-400" to="/explorer">
          Parcourir les commandes
        </Link>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function ExampleCard({ command, text, output }: { command: string; text: string; output?: string | undefined }) {
  return (
    <li className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="px-4 pt-3 text-sm text-zinc-600 dark:text-zinc-400">{text}</div>
      <div className="flex items-start gap-3 px-4 py-3">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-sm">
          <span className="select-none text-indigo-500">$ </span>
          {command}
        </code>
        <Link
          to={`/?c=${encodeURIComponent(command)}`}
          className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:ring-indigo-500/40 dark:hover:bg-indigo-500/10"
        >
          Expliquer
        </Link>
      </div>
      {output && (
        <pre className="overflow-x-auto border-t border-zinc-100 bg-zinc-50 px-4 py-3 font-mono text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          {output}
        </pre>
      )}
    </li>
  );
}

function DetailedDoc({ doc }: { doc: CommandDoc }) {
  const category = CATEGORY_BY_ID[doc.category];
  return (
    <article>
      <DocumentTitle title={`${doc.name} : ${doc.summary}`} />
      <Link
        to={`/explorer`}
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← {category.label}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-3xl font-semibold tracking-tight">{doc.name}</h1>
        <FavoriteButton command={doc.name} />
      </div>
      <p className="mt-2 text-lg text-zinc-700 dark:text-zinc-300">{doc.summary}</p>
      <p className="mt-4 max-w-3xl leading-relaxed text-zinc-600 dark:text-zinc-400">{doc.description}</p>
      {doc.dangerLevel && doc.dangerNote && <DangerNote level={doc.dangerLevel} note={doc.dangerNote} className="mt-6 max-w-3xl" />}

      <pre className="mt-6 overflow-x-auto rounded-xl bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-100 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
        {doc.synopsis}
      </pre>

      {doc.options.length > 0 && (
        <Section title="Options">
          <dl className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {doc.options.map((o) => (
              <div key={o.short ?? o.long} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                <dt className="font-mono text-sm text-amber-800 dark:text-amber-300">
                  {[o.short, o.long].filter(Boolean).join(', ')}
                  {o.takesValue && <span className="text-zinc-500 dark:text-zinc-400"> {o.valueName ?? 'VALEUR'}</span>}
                </dt>
                <dd className="text-sm text-zinc-700 dark:text-zinc-300">
                  {o.description}
                  {o.values && <span className="mt-1 block text-zinc-500 dark:text-zinc-400">Valeurs : {o.values.join(', ')}</span>}
                  {o.example && <ExampleBlock example={o.example} className="mt-2" />}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {doc.arguments && doc.arguments.length > 0 && (
        <Section title="Arguments">
          <dl className="space-y-3">
            {doc.arguments.map((a) => (
              <div key={a.name}>
                <dt className="font-mono text-sm text-emerald-800 dark:text-emerald-300">
                  {a.name}
                  {a.variadic && '...'}
                  {a.optional && <span className="ml-2 font-sans text-xs text-zinc-500">facultatif</span>}
                </dt>
                <dd className="text-sm text-zinc-700 dark:text-zinc-300">{a.description}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Section title="Exemples">
        <ul className="space-y-3">
          {doc.examples.map((ex) => (
            <ExampleCard key={ex.command} command={ex.command} text={ex.explanation} output={ex.output} />
          ))}
        </ul>
      </Section>

      {doc.seeAlso && doc.seeAlso.length > 0 && (
        <Section title="Voir aussi">
          <ul className="flex flex-wrap gap-2">
            {doc.seeAlso.map((s) => (
              <li key={s}>
                <Link
                  to={`/commande/${encodeURIComponent(s)}`}
                  className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-sm text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300"
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function TldrView({ doc }: { doc: TldrDoc }) {
  return (
    <article>
      <DocumentTitle title={doc.name} />
      <Link to="/explorer" className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        ← Explorer
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-3xl font-semibold tracking-tight">{doc.name}</h1>
        <FavoriteButton command={doc.name} />
      </div>
      <p className="mt-2 text-lg text-zinc-700 dark:text-zinc-300">{doc.summary}</p>
      <p className="mt-4 rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
        Fiche courte. Source :{' '}
        <a className="text-indigo-600 hover:underline dark:text-indigo-400" href={doc.sourceUrl}>
          tldr-pages
        </a>{' '}
        (licence{' '}
        <a className="text-indigo-600 hover:underline dark:text-indigo-400" href={TLDR_LICENSE}>
          CC BY 4.0
        </a>
        ){doc.lang === 'en' && ' — disponible uniquement en anglais'}.
        {doc.moreInfoUrl && (
          <>
            {' '}
            <a className="text-indigo-600 hover:underline dark:text-indigo-400" href={doc.moreInfoUrl}>
              Documentation officielle
            </a>
            .
          </>
        )}
      </p>
      <Section title="Exemples">
        <ul className="space-y-3">
          {doc.examples.map((ex) => (
            <ExampleCard key={ex.command} command={ex.command} text={ex.description} />
          ))}
        </ul>
      </Section>
    </article>
  );
}
