import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPage } from '../AdminPage';
import { renderWithProviders, testBackend } from '../../test-utils';
import type { AdminApi, Backend } from '../../types/backend';

const now = new Date().toISOString();

function fakeAdmin(isAdmin = true): AdminApi {
  let errors = [
    { id: 1, email: null, source: 'page', message: 'TypeError: x is undefined', detail: 'at LsPage', path: '/ls', userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', createdAt: now },
  ];
  return {
    isAdmin: vi.fn(async () => isAdmin),
    overview: vi.fn(async () => ({
      users: 2,
      usersLast7Days: 1,
      confirmed: 1,
      activeLast7Days: 1,
      attempts: 9,
      attemptsLast7Days: 4,
      correctLast7Days: 3,
      errorsLast7Days: errors.length,
    })),
    users: vi.fn(async () => [
      { id: 'u1', email: 'sara@exemple.fr', displayName: 'Sara', createdAt: now, lastSignInAt: now, confirmed: true, attempts: 9, solved: 4 },
      { id: 'u2', email: 'lea@exemple.fr', displayName: null, createdAt: now, lastSignInAt: null, confirmed: false, attempts: 0, solved: 0 },
    ]),
    // Sara : 2 bonnes réponses sur 7 ; permissions jamais réussies ; Léa n'a pas encore répondu
    attempts: vi.fn(async () =>
      (
        [
          ['w-pwd', true],
          ['w-ls-la', false],
          ['w-ls-la', false],
          ['w-ls-la', true],
          ['p-to-octal-644', false],
          ['p-to-octal-644', false],
          ['p-to-octal-644', false],
        ] as const
      ).map(([exerciseId, correct], i) => ({
        userId: 'u1',
        exerciseId,
        kind: exerciseId.startsWith('p-') ? ('perm' as const) : ('write' as const),
        correct,
        usedHelp: false,
        createdAt: new Date(Date.now() - (10 - i) * 60000).toISOString(),
      })),
    ),
    errors: vi.fn(async () => errors),
    clearErrors: vi.fn(async () => {
      errors = [];
    }),
  };
}

async function renderAdmin(admin: AdminApi | undefined) {
  const base = await testBackend(true);
  const backend: Backend = { ...base, ...(admin ? { admin } : {}) };
  return renderWithProviders(<AdminPage />, { backend });
}

describe('AdminPage', () => {
  it('mode démo : explique qu’il faut Supabase', async () => {
    await renderAdmin(undefined);
    expect(screen.getByText(/a besoin de la vraie base de données/)).toBeInTheDocument();
  });

  it('non-administrateur : la page n’existe pas', async () => {
    const admin = fakeAdmin(false);
    await renderAdmin(admin);
    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
    expect(admin.overview).not.toHaveBeenCalled();
  });

  it('administrateur : chiffres, problèmes et résultats par utilisateur', async () => {
    await renderAdmin(fakeAdmin());
    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(await screen.findByText('Inscrits')).toBeInTheDocument();
    expect(screen.getByText(/1 non confirmé/)).toBeInTheDocument();
    expect(screen.getByText('75 % justes · 9 au total')).toBeInTheDocument();
    expect(screen.getByText('⚠ À examiner')).toBeInTheDocument();

    const problems = screen.getByRole('region', { name: 'Problèmes (1)' });
    expect(within(problems).getByText('TypeError: x is undefined')).toBeInTheDocument();
    expect(within(problems).getByText(/\/ls · visiteur sans compte · Chrome · Windows/)).toBeInTheDocument();

    const users = screen.getByRole('region', { name: 'Utilisateurs (2)' });
    const [, sara, lea] = within(users).getAllByRole('row');
    expect(within(sara!).getByText('Sara')).toBeInTheDocument();
    expect(within(sara!).getByText('29 %')).toBeInTheDocument(); // 2 / 7
    expect(within(sara!).getByText('Permissions et utilisateurs')).toBeInTheDocument(); // point faible
    expect(within(lea!).getByText('⏳ e-mail non confirmé')).toBeInTheDocument();
    expect(within(lea!).getAllByText('—')).toHaveLength(2); // ni réussite ni point faible sans réponse
  });

  it('détail d’un utilisateur : catégories, exercices à revoir, premier coup', async () => {
    const user = userEvent.setup();
    await renderAdmin(fakeAdmin());
    const toggle = await screen.findByRole('button', { name: 'Afficher le détail de Sara' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Réussite par catégorie')).toBeInTheDocument();
    expect(screen.getByText('Fichiers et répertoires')).toBeInTheDocument();
    expect(screen.getByText(/3 erreurs, pas encore réussi/)).toBeInTheDocument();
    expect(screen.getByText(/2 erreurs, réussi ensuite/)).toBeInTheDocument();
    expect(screen.getByText(/1 exercice réussi du premier coup/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Masquer le détail de Sara' }));
    expect(screen.queryByText('Réussite par catégorie')).not.toBeInTheDocument();
  });

  it('recherche parmi les utilisateurs', async () => {
    const user = userEvent.setup();
    await renderAdmin(fakeAdmin());
    await user.type(await screen.findByRole('searchbox', { name: 'Rechercher un utilisateur' }), 'lea');
    const users = screen.getByRole('region', { name: 'Utilisateurs (2)' });
    expect(within(users).queryByText('Sara')).not.toBeInTheDocument();
    expect(within(users).getByText('lea@exemple.fr')).toBeInTheDocument();
  });

  it('effacer les erreurs demande une confirmation', async () => {
    const user = userEvent.setup();
    const admin = fakeAdmin();
    await renderAdmin(admin);
    await user.click(await screen.findByRole('button', { name: 'Tout effacer' }));
    expect(admin.clearErrors).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Oui, effacer' }));
    expect(admin.clearErrors).toHaveBeenCalled();
    expect(await screen.findByText(/Aucune erreur enregistrée/)).toBeInTheDocument();
  });

  it('base mal configurée : message clair au lieu d’une page vide', async () => {
    const admin = fakeAdmin();
    admin.overview = vi.fn(async () => {
      throw new Error('function public.admin_overview() does not exist');
    });
    await renderAdmin(admin);
    expect(await screen.findByRole('alert')).toHaveTextContent(/admin\.sql/);
  });
});
