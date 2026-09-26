import { useCallback, useEffect, useState } from 'react';
import { buttonClass } from '../components/practice/Feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { NotFoundPage } from '../pages/NotFoundPage';
import type { AdminApi, AdminOverview, AdminUser, ErrorLog, FeedbackEntry } from '../types/backend';
import { ErrorsPanel, FeedbackPanel, OverviewTiles, UsersPanel } from './Panels';
import { resultsByUser, type UserResults } from './userResults';

/*
 * Tableau de bord réservé à l'administrateur (route /admin, derrière <RequireAuth>).
 * La page vérifie le rôle pour l'affichage, mais la vraie protection est dans la base :
 * chaque fonction admin_* de supabase/admin.sql refuse un appelant qui n'est pas admin.
 */

interface Dashboard {
  overview: AdminOverview;
  errors: ErrorLog[];
  feedback: FeedbackEntry[];
  users: AdminUser[];
  results: Map<string, UserResults>;
}

async function loadDashboard(admin: AdminApi): Promise<Dashboard> {
  const [overview, errors, feedback, users, attempts] = await Promise.all([
    admin.overview(),
    admin.errors(),
    admin.feedback(),
    admin.users(),
    admin.attempts(),
  ]);
  return { overview, errors, feedback, users, results: resultsByUser(attempts) };
}

export function AdminPage() {
  const { backend } = useAuth();
  const admin = backend.admin;
  const [access, setAccess] = useState<'checking' | 'granted' | 'denied'>('checking');

  useEffect(() => {
    if (!admin) return;
    let alive = true;
    admin
      .isAdmin()
      .then((ok) => alive && setAccess(ok ? 'granted' : 'denied'))
      .catch(() => alive && setAccess('denied'));
    return () => {
      alive = false;
    };
  }, [admin]);

  if (!admin) {
    return (
      <PageHeader title="Tableau de bord">
        Le tableau de bord a besoin de la vraie base de données : configurez Supabase (voir le README). En mode démo, les comptes
        n’existent que dans ce navigateur.
      </PageHeader>
    );
  }
  if (access === 'checking') return <p className="text-zinc-500">Chargement…</p>;
  // Pour un non-administrateur, la page n'existe pas
  if (access === 'denied') return <NotFoundPage />;
  return <Dashboard admin={admin} />;
}

function Dashboard({ admin }: { admin: AdminApi }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date>();

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await loadDashboard(admin));
      setError(undefined);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [admin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Tableau de bord">
          Inscrits, résultats aux exercices, messages des visiteurs et problèmes du site.
          {updatedAt && <> Mis à jour à {updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.</>}
        </PageHeader>
        <button type="button" className={buttonClass.secondary} onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Actualisation…' : '↻ Actualiser'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
          Chargement impossible : {error}. Vérifiez que <code className="font-mono">supabase/admin.sql</code> a bien été exécuté.
        </p>
      )}

      {!data ? (
        !error && <p className="text-zinc-500">Chargement…</p>
      ) : (
        <div className="space-y-6">
          <OverviewTiles o={data.overview} />
          <UsersPanel users={data.users} results={data.results} />
          <FeedbackPanel
            feedback={data.feedback}
            onClear={async () => {
              await admin.clearFeedback();
              await refresh();
            }}
          />
          <ErrorsPanel
            errors={data.errors}
            onClear={async () => {
              await admin.clearErrors();
              await refresh();
            }}
          />
        </div>
      )}
    </>
  );
}
