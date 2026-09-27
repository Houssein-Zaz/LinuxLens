import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import App from '../../App';
import { safeNext } from '../../components/auth/RequireAuth';
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
// `find…` : les pages sont chargées à la demande, le formulaire apparaît après un instant
const fill = async (label: string | RegExp, value: string) => userEvent.type(await screen.findByLabelText(label), value);

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
    expect(screen.getByRole('button', { name: 'Mon compte' })).toHaveTextContent('S');
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

  it('safeNext : garde les chemins internes, refuse les autres sites même déguisés', () => {
    expect(safeNext('/exercices?mode=qcm#q2')).toBe('/exercices?mode=qcm#q2');
    for (const evil of ['//pirate.example', '/\\pirate.example', '/\t/pirate.example', '/\n/pirate.example', 'https://pirate.example', 'javascript:alert(1)', null]) {
      expect(safeNext(evil)).toBe('/compte');
    }
  });

  it('page du compte protégée', async () => {
    renderApp('/compte', await testBackend());
    await waitFor(() => expect(location()).toBe('/connexion?next=%2Fcompte'));
  });

  it('afficher / masquer le mot de passe', async () => {
    renderApp('/connexion', await testBackend());
    const field = await screen.findByLabelText('Mot de passe');
    expect(field).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Afficher' }));
    expect(field).toHaveAttribute('type', 'text');
  });

  it('mot de passe oublié : message clair en mode démo', async () => {
    renderApp('/mot-de-passe-oublie', await testBackend());
    expect(await screen.findByRole('note')).toHaveTextContent('Mode démo');
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
  it('chaque réponse est enregistrée et résumée dans « Mes résultats »', async () => {
    const user = userEvent.setup();
    const backend = await testBackend(true);
    await backend.data.addProgress(['w-pwd']); // déjà réussi : on peut passer au suivant sans répondre
    const { unmount } = renderApp('/exercices', backend);
    await user.selectOptions(await screen.findByLabelText('Catégorie'), 'files');
    await user.click(screen.getByRole('button', { name: 'Suivant →' }));
    const input = screen.getByLabelText('Votre commande');
    await user.type(input, 'ls -l{Enter}'); // incomplet
    await user.clear(input);
    await user.type(input, 'ls -la{Enter}');
    await user.type(input, '{Enter}'); // déjà réussi : pas de second essai
    await waitFor(async () => expect(await backend.data.getAttempts()).toHaveLength(2));
    expect((await backend.data.getAttempts()).map((a) => a.correct)).toEqual([true, false]);
    unmount();

    renderApp('/compte', backend);
    const results = await screen.findByRole('region', { name: 'Ma progression' });
    expect(await within(results).findByText('50 %')).toBeInTheDocument();
    expect(within(results).getByText('1 bonne réponse sur 2')).toBeInTheDocument();
    expect(within(results).getByText(/1 erreur · réussi/)).toBeInTheDocument();
  });

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
    const dialog = screen.getByRole('alertdialog', { name: 'Retirer ce favori ?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Retirer' }));
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

  it('menu du compte : liens vers les pages du compte, fermeture avec Échap', async () => {
    const user = userEvent.setup();
    const backend = await testBackend(true);
    renderApp('/', backend);
    const button = await screen.findByRole('button', { name: 'Mon compte' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    const menu = screen.getByRole('menu', { name: 'Mon compte' });
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['Mon compte', 'Changer le mot de passe', 'Supprimer mon compte', 'Se déconnecter']);
    expect(items[0]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    await user.click(button);
    await user.click(screen.getByRole('menuitem', { name: 'Changer le mot de passe' }));
    expect(await screen.findByRole('heading', { name: 'Changer le mot de passe' })).toBeInTheDocument();
    expect(location()).toBe('/compte/mot-de-passe');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('suppression du compte après confirmation', async () => {
    const backend = await testBackend(true);
    renderApp('/compte/suppression', backend);
    const confirm = await screen.findByRole('button', { name: 'Supprimer définitivement' });
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
    await userEvent.click(await screen.findByRole('button', { name: 'Mon compte' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }));
    await waitFor(() => expect(location()).toBe('/'));
    expect(screen.getByRole('link', { name: 'Connexion' })).toBeInTheDocument();
  });
});

describe('Mon compte : messages', () => {
  it('affiche la réponse de l’administrateur sous le message', async () => {
    const backend = await testBackend(true);
    backend.data.getMyFeedback = async () => [
      { id: 1, liked: '', disliked: '', message: 'Il manque parted.', command: 'parted -l', createdAt: '2026-09-20T10:00:00Z', reply: 'Ajouté, merci !', repliedAt: '2026-09-21T10:00:00Z' },
      { id: 2, liked: '', disliked: '', message: 'Et mkfs ?', command: '', createdAt: '2026-09-22T10:00:00Z', reply: null, repliedAt: null },
    ];
    renderApp('/compte', backend);
    const card = await screen.findByRole('region', { name: 'Mes messages' });
    expect(await within(card).findByText('Ajouté, merci !')).toBeInTheDocument();
    expect(within(card).getByText('Réponse de LinuxLens')).toBeInTheDocument();
    expect(within(card).getByText('En attente de réponse')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'parted -l' })).toHaveAttribute('href', '/?c=parted%20-l');
  });
});

describe('Mon compte : confirmation avant de modifier ou supprimer', () => {
  it('historique : Annuler ne touche à rien, Effacer efface', async () => {
    const user = userEvent.setup();
    const backend = await testBackend(true);
    await backend.data.addHistory('ls -la');
    renderApp('/compte', backend);
    const clear = await screen.findByRole('button', { name: 'Effacer l’historique' });

    await user.click(clear);
    const dialog = screen.getByRole('alertdialog', { name: 'Effacer l’historique ?' });
    expect(dialog).toHaveTextContent('1 commande');
    expect(within(dialog).getByRole('button', { name: 'Annuler' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(clear).toHaveFocus();
    expect(await backend.data.getHistory()).toHaveLength(1);

    await user.click(clear);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await backend.data.getHistory()).toHaveLength(1);

    await user.click(clear);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Effacer' }));
    await waitFor(async () => expect(await backend.data.getHistory()).toEqual([]));
  });

  it('profil : rien n’est modifié sans confirmation', async () => {
    const user = userEvent.setup();
    const backend = await testBackend(true);
    const updateProfile = vi.spyOn(backend.auth, 'updateProfile');
    renderApp('/compte', backend);

    const name = await screen.findByLabelText('Nom affiché');
    await user.clear(name);
    await user.type(name, 'Sara B.');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Modifier votre profil ?' });
    expect(dialog).toHaveTextContent('« Sara B. »');
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(updateProfile).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Enregistrer' }));
    expect(updateProfile).toHaveBeenCalledWith('Sara B.');
    expect(await screen.findByText('Profil enregistré.')).toBeInTheDocument();
  });

  it('mot de passe : vérifié, confirmé, puis modifié', async () => {
    const user = userEvent.setup();
    const backend = await testBackend(true);
    const updatePassword = vi.spyOn(backend.auth, 'updatePassword');
    renderApp('/compte/mot-de-passe', backend);

    await user.type(await screen.findByLabelText('Nouveau mot de passe'), 'nouveaumdp9');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'autre');
    await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Les deux mots de passe ne correspondent pas.');

    await user.clear(screen.getByLabelText('Confirmer le mot de passe'));
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'nouveaumdp9');
    await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Changer votre mot de passe ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(updatePassword).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Changer le mot de passe' }));
    expect(updatePassword).toHaveBeenCalledWith('nouveaumdp9');
    expect(await screen.findByText('Mot de passe modifié.')).toBeInTheDocument();
  });
});
