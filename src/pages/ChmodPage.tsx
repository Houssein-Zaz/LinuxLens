import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PermissionGrid } from '../components/permissions/PermissionGrid';
import { SyncedField } from '../components/permissions/SyncedField';
import { PageHeader } from '../components/ui/PageHeader';
import {
  applyChmod,
  describePermissions,
  describeSymbolicMode,
  fromOctal,
  fromSymbolic,
  toChmodSymbolic,
  toOctal,
  toSymbolic,
  type Permissions,
  type Right,
  type Who,
} from '../lib/permissions';

const PRESETS = [
  { mode: '644', label: 'Fichier classique' },
  { mode: '755', label: 'Script, répertoire' },
  { mode: '600', label: 'Fichier privé' },
  { mode: '700', label: 'Répertoire privé' },
  { mode: '750', label: 'Partagé avec le groupe' },
  { mode: '777', label: 'Tout pour tous (à éviter)' },
];

export function ChmodPage() {
  const [params, setParams] = useSearchParams();
  const perms = fromOctal(params.get('mode') ?? '') ?? fromOctal('644')!;
  const [target, setTarget] = useState('fichier');
  const [change, setChange] = useState('');

  const set = useCallback((p: Permissions) => setParams({ mode: toOctal(p) }, { replace: true }), [setParams]);

  const toggle = (who: Who, right: Right) => {
    const next = structuredClone(perms);
    next[who][right] = !next[who][right];
    set(next);
  };
  const toggleSpecial = (key: 'setuid' | 'setgid' | 'sticky') => set({ ...perms, [key]: !perms[key] });

  const octal = toOctal(perms);
  const symbolic = toSymbolic(perms);
  const quotedTarget = /\s/.test(target) ? `"${target}"` : target || 'fichier';
  const changeResult = change.trim() ? applyChmod(perms, change.trim()) : null;

  return (
    <>
      <PageHeader title="Calculateur de permissions">
        Cochez les cases ou modifiez l’une des notations : tout reste synchronisé.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section aria-label="Grille des permissions" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <PermissionGrid value={perms} onToggle={toggle} />

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Bits spéciaux (setuid, setgid, sticky)
            </summary>
            <div className="mt-3 space-y-2">
              {(
                [
                  ['setuid', 'setuid (4000)', 'le programme s’exécute avec les droits de son propriétaire'],
                  ['setgid', 'setgid (2000)', 'droits du groupe ; sur un répertoire, les fichiers créés héritent du groupe'],
                  ['sticky', 'sticky (1000)', 'dans un répertoire, seul le propriétaire d’un fichier peut le supprimer'],
                ] as const
              ).map(([key, label, text]) => (
                <label key={key} className="flex cursor-pointer items-start gap-2">
                  <input type="checkbox" checked={perms[key]} onChange={() => toggleSpecial(key)} className="mt-1 accent-indigo-600" />
                  <span>
                    <span className="font-mono">{label}</span>{' '}
                    <span className="text-zinc-500 dark:text-zinc-400">— {text}</span>
                  </span>
                </label>
              ))}
            </div>
          </details>
        </section>

        <section aria-label="Notations" className="space-y-5">
          <SyncedField
            label="Notation symbolique"
            value={symbolic}
            hint="9 caractères comme dans ls -l : rwxr-x---"
            onCommit={(t) => {
              const p = fromSymbolic(t);
              if (p) set(p);
              return p !== null;
            }}
          />
          <SyncedField
            label="Notation octale"
            value={octal}
            hint="3 chiffres de 0 à 7 (4 avec un bit spécial) : 750"
            onCommit={(t) => {
              const p = fromOctal(t);
              if (p) set(p);
              return p !== null;
            }}
          />

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">Commande chmod</span>
              <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                Fichier
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="h-7 w-32 rounded-md border border-zinc-200 bg-white px-2 font-mono text-xs text-zinc-900 outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </label>
            </div>
            <div className="space-y-1 rounded-xl bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-100 dark:ring-1 dark:ring-zinc-800">
              <div>
                <span className="select-none text-indigo-400">$ </span>chmod {octal} {quotedTarget}
              </div>
              <div className="text-zinc-400">
                <span className="select-none text-zinc-600">$ </span>chmod {toChmodSymbolic(perms)} {quotedTarget}
              </div>
            </div>
          </div>

          <p className="rounded-xl bg-indigo-50/60 px-4 py-3 text-sm text-zinc-700 dark:bg-indigo-500/10 dark:text-zinc-300" aria-live="polite">
            {describePermissions(perms)}.
          </p>
        </section>
      </div>

      <section aria-labelledby="presets" className="mt-10">
        <h2 id="presets" className="mb-3 text-lg font-semibold tracking-tight">
          Modes courants
        </h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.mode}
              type="button"
              onClick={() => set(fromOctal(p.mode)!)}
              aria-pressed={octal === p.mode}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                octal === p.mode
                  ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/15'
                  : 'border-zinc-200 bg-white hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/60'
              }`}
            >
              <span className="block font-mono font-semibold">
                {p.mode} <span className="font-normal text-zinc-500 dark:text-zinc-400">{toSymbolic(fromOctal(p.mode)!)}</span>
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{p.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="apply" className="mt-10 max-w-2xl">
        <h2 id="apply" className="mb-1 text-lg font-semibold tracking-tight">
          Tester un changement
        </h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Tapez un mode symbolique (u+x, go-w, a=r…) pour voir son effet sur les permissions actuelles.
        </p>
        <div className="flex gap-2">
          <input
            value={change}
            onChange={(e) => setChange(e.target.value)}
            placeholder="u+x"
            aria-label="Mode chmod à tester"
            spellCheck={false}
            className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 font-mono shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900"
          />
          <button
            type="button"
            disabled={!changeResult}
            onClick={() => {
              if (changeResult) set(changeResult);
              setChange('');
            }}
            className="rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Appliquer
          </button>
        </div>
        {change.trim() && (
          <p className="mt-2 text-sm" aria-live="polite">
            {changeResult ? (
              <>
                <span className="font-mono">{symbolic}</span> → <span className="font-mono font-semibold">{toSymbolic(changeResult)}</span>{' '}
                <span className="font-mono text-zinc-500">({toOctal(changeResult)})</span>
                {describeSymbolicMode(change.trim()) && (
                  <span className="block text-zinc-500 dark:text-zinc-400">{describeSymbolicMode(change.trim())}</span>
                )}
              </>
            ) : (
              <span className="text-red-600 dark:text-red-400">Mode invalide.</span>
            )}
          </p>
        )}
      </section>
    </>
  );
}
