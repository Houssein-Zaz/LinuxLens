import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import App from '../../App';
import { testBackend } from '../../test-utils';
import type { Backend } from '../../types/backend';

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 404 }))));

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

function renderApp(url: string, backend: Backend) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <App backend={backend} />
      <Location />
    </MemoryRouter>,
  );
}

const location = () => screen.getByTestId('location').textContent;
const fill = async (label: string | RegExp, value: string) => userEvent.type(screen.getByLabelText(label), value);

beforeEach(() => localStorage.clear());

describe('inscription et connexion', () => {
  it('inscription → compte ouvert, initiale dans l’en-tête', async () => {
    const backend = await testBackend();
    renderApp('/inscription', backend);
    await fill('Nom affiché (facultatif)', 'Sara');
    await fill('Adresse e-mail', 'sara@exemple.fr');
    await fill('Mot de passe', 'motdepasse1');
    await fill('Confirmer le mot de passe', 'motdepasse1');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByRole('heading', { name: 'Mon compte' })).toBeInTheDocument();
    expect(location()).toBe('/compte');
    expect(screen.getByRole('link', { name: 'Mon compte' })).toHaveTextContent('S');
    expect(screen.getByText('sara@exemple.fr')).toBeInTheDocument();
  });

  it('inscription : erreurs de formulaire affichées à côté des champs', async () => {
    renderApp('/inscription', await testBackend());
    await fill('Adresse e-mail', 'pas-un-email');
    await fill('Mot de passe', 'court');
    await fill('Confirmer le mot de passe', 'autre');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(screen.getByText('Cette adresse e-mail n’est pas valide.')).toBeInTheDocument();
    expect(screen.getByText(/au moins 8 caractères/)).toBeInTheDocument();
    expect(screen.getByText('Les deux mots de passe ne correspondent pas.')).toBeInTheDocument();
  });

  it('connexion : erreur, puis succès avec retour à la page demandée', async () => {
    const backend = await testBackend(true);
    await backend.auth.signOut();
    renderApp('/connexion?next=%2Fexercices', backend);
    await fill('Adresse e-mail', 'sara@exemple.fr');
    await fill('Mot de passe', 'mauvais12');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect.');

    await userEvent.clear(screen.getByLabelText('Mot de passe'));
    await fill('Mot de passe', 'motdepasse1');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await waitFor(() => expect(location()).toBe('/exercices'));
  });

  it('refuse une redirection vers un autre site après connexion', async () => {
    renderApp('/connexion?next=%2F%2Fpirate.example', await testBackend(true));
    await waitFor(() => expect(location()).toBe('/compte'));
  });

  it('page du compte protégée', async () => {
    renderApp('/compte', await testBackend());
    await waitFor(() => expect(location()).toBe('/connexion?next=%2Fcompte'));
  });

  it('afficher / masquer le mot de passe', async () => {
    renderApp('/connexion', await testBackend());
    const field = screen.getByLabelText('Mot de passe');
    expect(field).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Afficher' }));
    expect(field).toHaveAttribute('type', 'text');
  });

  it('mot de passe oublié : message clair en mode démo', async () => {
    renderApp('/mot-de-passe-oublie', await testBackend());
    expect(screen.getByRole('note')).toHaveTextContent('Mode démo');
    await fill('Adresse e-mail', 'sara@exemple.fr');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('mode démo');
  });

  it('lien de réinitialisation sans session : lien expiré', async () => {
    renderApp('/nouveau-mot-de-passe', await testBackend());
    expect(await screen.findByRole('heading', { name: 'Lien invalide ou expiré' })).toBeInTheDocument();
  });
});

describe('données du compte', () => {
  it('la progression faite hors connexion est fusionnée dans le compte', async () => {
    localStorage.setItem('linuxlens-progress', JSON.stringify(['w-pwd']));
    const backend = await testBackend(true);
    renderApp('/exercices', backend);
    await waitFor(async () => expect(await backend.data.getProgress()).toEqual(['w-pwd']));
    expect(localStorage.getItem('linuxlens-progress')).toBeNull();
    expect(await screen.findByText('✓ Réussi')).toBeInTheDocument();
  });

  it('favoris : ajout depuis une fiche, visible dans le compte, retrait', async () => {
    const backend = await testBackend(true);
    const { unmount } = renderApp('/commande/tar', backend);
    await userEvent.click(await screen.findByRole('button', { name: /Ajouter aux favoris/ }));
    expect(screen.getByRole('button', { name: /Dans vos favoris/ })).toHaveAttribute('aria-pressed', 'true');
    expect(await backend.data.getFavorites()).toEqual(['tar']);
    unmount();

    renderApp('/compte', backend);
    await userEvent.click(await screen.findByRole('button', { name: 'Retirer tar des favoris' }));
    expect(await backend.data.getFavorites()).toEqual([]);
  });

  it('favoris sans compte : invitation à se connecter', async () => {
    renderApp('/commande/tar', await testBackend());
    expect(await screen.findByRole('link', { name: /Ajouter aux favoris/ })).toHaveAttribute('href', '/connexion?next=%2Fcommande%2Ftar');
  });

  it('les commandes expliquées sont ajoutées à l’historique', async () => {
    const backend = await testBackend(true);
    renderApp('/?c=' + encodeURIComponent('ls -la'), backend);
    await waitFor(async () => expect((await backend.data.getHistory()).map((h) => h.command)).toEqual(['ls -la']), {
      timeout: 4000,
    });
  });

  it('suppression du compte après confirmation', async () => {
    const backend = await testBackend(true);
    renderApp('/compte', backend);
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer mon compte…' }));
    const confirm = screen.getByRole('button', { name: 'Supprimer définitivement' });
    expect(confirm).toBeDisabled();
    await fill('Confirmation', 'SUPPRIMER');
    await userEvent.click(confirm);
    await waitFor(() => expect(location()).toBe('/'));
    expect(await backend.auth.getUser()).toBeNull();
    expect((await backend.auth.signIn('sara@exemple.fr', 'motdepasse1')).error).toBeDefined();
  });

  it('déconnexion', async () => {
    const backend = await testBackend(true);
    renderApp('/compte', backend);
    await userEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }));
    await waitFor(() => expect(location()).toBe('/'));
    expect(screen.getByRole('link', { name: 'Connexion' })).toBeInTheDocument();
  });
});
