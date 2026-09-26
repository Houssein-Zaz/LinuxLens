import { Fragment, useState, type ReactNode } from 'react';
import { buttonClass } from '../components/practice/Feedback';
import { CATEGORY_BY_ID } from '../data/categories';
import { ALL_EXERCISES, EXERCISE_BY_ID, exerciseTitle } from '../data/exercises';
import type { AdminOverview, AdminUser, ErrorLog } from '../types/backend';
import { fullDate, percent, shortAgent, timeAgo } from './format';
import type { UserResults } from './userResults';

export function Panel({ title, id, action, children }: { title: string; id: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const muted = 'text-zinc-500 dark:text-zinc-400';

/* ------------------------------------------------------------------ */
/* Chiffres clés                                                       */
/* ------------------------------------------------------------------ */

export function OverviewTiles({ o }: { o: AdminOverview }) {
  const pending = o.users - o.confirmed;
  const tiles: Array<{ label: string; value: number; detail: ReactNode }> = [
    { label: 'Inscrits', value: o.users, detail: `+${o.usersLast7Days} cette semaine${pending ? ` · ${pending} non confirmé${pending > 1 ? 's' : ''}` : ''}` },
    { label: 'Actifs (7 jours)', value: o.activeLast7Days, detail: 'connectés cette semaine' },
    { label: 'Réponses (7 jours)', value: o.attemptsLast7Days, detail: `${percent(o.correctLast7Days, o.attemptsLast7Days)} justes · ${o.attempts} au total` },
    {
      label: 'Problèmes (7 jours)',
      value: o.errorsLast7Days,
      // Statut : icône + texte, jamais la couleur seule
      detail:
        o.errorsLast7Days > 0 ? (
          <span className="font-medium text-amber-700 dark:text-amber-300">⚠ À examiner</span>
        ) : (
          <span className="font-medium text-emerald-700 dark:text-emerald-300">✓ Aucun</span>
        ),
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <dt className={`text-sm ${muted}`}>{t.label}</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{t.value}</dd>
          <dd className={`mt-1 text-xs ${muted}`}>{t.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* Problèmes                                                           */
/* ------------------------------------------------------------------ */

const SOURCE_LABEL: Record<string, string> = {
  page: 'Plantage de page',
  window: 'Erreur JavaScript',
  promise: 'Erreur asynchrone',
  auth: 'Compte / connexion',
};

export function ErrorsPanel({ errors, onClear }: { errors: ErrorLog[]; onClear(): Promise<void> }) {
  const [confirming, setConfirming] = useState(false);

  const action =
    errors.length === 0 ? null : confirming ? (
      <span className="flex items-center gap-2 text-sm">
        Effacer les {errors.length} erreurs ?
        <button
          type="button"
          className="rounded-lg bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-700"
          onClick={async () => {
            await onClear();
            setConfirming(false);
          }}
        >
          Oui, effacer
        </button>
        <button type="button" className={`underline-offset-2 hover:underline ${muted}`} onClick={() => setConfirming(false)}>
          Annuler
        </button>
      </span>
    ) : (
      <button type="button" className={buttonClass.secondary} onClick={() => setConfirming(true)}>
        Tout effacer
      </button>
    );

  return (
    <Panel title={`Problèmes${errors.length ? ` (${errors.length})` : ''}`} id="admin-problemes" action={action}>
      {errors.length === 0 ? (
        <p className={`text-sm ${muted}`}>✓ Aucune erreur enregistrée. Les plantages et les erreurs inattendues des visiteurs apparaîtront ici.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {errors.map((e) => (
            <li key={e.id} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                  ⚠ {SOURCE_LABEL[e.source] ?? e.source}
                </span>
                <time dateTime={e.createdAt} title={fullDate(e.createdAt)} className={`text-xs ${muted}`}>
                  {timeAgo(e.createdAt)}
                </time>
              </div>
              <p className="mt-1.5 font-mono text-sm [overflow-wrap:anywhere]">{e.message}</p>
              <p className={`mt-1 text-xs ${muted}`}>
                {e.path || '/'} · {e.email ?? 'visiteur sans compte'} · {shortAgent(e.userAgent)}
              </p>
              {e.detail && (
                <details className="mt-2">
                  <summary className={`cursor-pointer text-xs ${muted}`}>Détails techniques</summary>
                  <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-800">{e.detail}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}


/* ------------------------------------------------------------------ */
/* Utilisateurs et résultats                                           */
/* ------------------------------------------------------------------ */

/** Taux de réussite avec un repère textuel : la couleur n'est jamais la seule information. */
function Rate({ correct, total }: { correct: number; total: number }) {
  if (!total) return <span className={muted}>—</span>;
  const rate = correct / total;
  const tone = rate >= 0.8 ? 'text-emerald-700 dark:text-emerald-300' : rate >= 0.5 ? '' : 'text-amber-700 dark:text-amber-300';
  return <span className={`font-medium tabular-nums ${tone}`}>{percent(correct, total)}</span>;
}

function UserDetails({ user, results }: { user: AdminUser; results: UserResults | undefined }) {
  return (
    <div className="grid gap-5 text-sm sm:grid-cols-3">
      <div>
        <h4 className={`mb-1.5 text-xs font-medium ${muted}`}>Compte</h4>
        <p>
          Inscrit le {fullDate(user.createdAt)}
          <br />
          Dernière connexion : {user.lastSignInAt ? fullDate(user.lastSignInAt) : 'jamais'}
          <br />
          {results && <>Dernière réponse : {timeAgo(results.lastActivity)}</>}
        </p>
      </div>
      <div>
        <h4 className={`mb-1.5 text-xs font-medium ${muted}`}>Réussite par catégorie</h4>
        {results?.byCategory.length ? (
          <ul className="space-y-0.5">
            {[...results.byCategory].reverse().map((c) => (
              <li key={c.category} className="flex justify-between gap-3">
                <span>{CATEGORY_BY_ID[c.category].label}</span>
                <span>
                  <Rate correct={c.correct} total={c.attempts} /> <span className={`text-xs ${muted}`}>({c.attempts})</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={muted}>Aucune réponse.</p>
        )}
      </div>
      <div>
        <h4 className={`mb-1.5 text-xs font-medium ${muted}`}>À revoir</h4>
        {results?.toReview.length ? (
          <ul className="space-y-1">
            {results.toReview.map((r) => {
              const ex = EXERCISE_BY_ID.get(r.exerciseId);
              return (
                <li key={r.exerciseId}>
                  {ex ? exerciseTitle(ex) : r.exerciseId}{' '}
                  <span className={`text-xs ${r.solved ? muted : 'text-amber-700 dark:text-amber-300'}`}>
                    ({r.errors} erreur{r.errors > 1 ? 's' : ''}
                    {r.solved ? ', réussi ensuite' : ', pas encore réussi'})
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={muted}>{results ? 'Aucune erreur.' : '—'}</p>
        )}
        {results && (
          <p className={`mt-2 text-xs ${muted}`}>
            {results.firstTry} exercice{results.firstTry > 1 ? 's' : ''} réussi{results.firstTry > 1 ? 's' : ''} du premier coup, sans aide.
          </p>
        )}
      </div>
    </div>
  );
}

export function UsersPanel({ users, results }: { users: AdminUser[]; results: Map<string, UserResults> }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const shown = q ? users.filter((u) => u.email.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q)) : users;

  return (
    <Panel
      title={`Utilisateurs (${users.length})`}
      id="admin-utilisateurs"
      action={
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher…"
          aria-label="Rechercher un utilisateur"
          className="h-9 w-48 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      }
    >
      {shown.length === 0 ? (
        <p className={`text-sm ${muted}`}>{users.length ? 'Aucun utilisateur ne correspond.' : 'Personne ne s’est encore inscrit.'}</p>
      ) : (
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className={`text-xs ${muted}`}>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-5 py-2 font-medium sm:px-6">Utilisateur</th>
                <th className="px-3 py-2 font-medium">Inscrit</th>
                <th className="px-3 py-2 text-right font-medium">Réponses</th>
                <th className="px-3 py-2 text-right font-medium">Réussite</th>
                <th className="px-3 py-2 text-right font-medium">Réussis</th>
                <th className="px-3 py-2 font-medium">Point faible</th>
                <th className="px-5 py-2 sm:px-6">
                  <span className="sr-only">Détails</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const r = results.get(u.id);
                const expanded = open === u.id;
                const name = u.displayName ?? u.email;
                return (
                  <Fragment key={u.id}>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="px-5 py-2.5 sm:px-6">
                        <div className="font-medium">{name}</div>
                        {u.displayName && <div className={`text-xs ${muted}`}>{u.email}</div>}
                        {!u.confirmed && <div className="text-xs text-amber-700 dark:text-amber-300">⏳ e-mail non confirmé</div>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" title={fullDate(u.createdAt)}>
                        {timeAgo(u.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r?.attempts ?? 0}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Rate correct={r?.correct ?? 0} total={r?.attempts ?? 0} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {r?.solved ?? 0}
                        <span className={muted}> / {ALL_EXERCISES.length}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {r?.weakest ? (
                          <>
                            {CATEGORY_BY_ID[r.weakest.category].label}{' '}
                            <span className={`text-xs ${muted}`}>({percent(r.weakest.correct, r.weakest.attempts)})</span>
                          </>
                        ) : (
                          <span className={muted}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right sm:px-6">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-label={`${expanded ? 'Masquer' : 'Afficher'} le détail de ${name}`}
                          onClick={() => setOpen(expanded ? null : u.id)}
                          className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        >
                          <span aria-hidden="true" className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>
                            ▸
                          </span>
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40">
                        <td colSpan={7} className="px-5 py-4 sm:px-6">
                          <UserDetails user={u} results={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
