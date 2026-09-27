import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PracticePage } from '../PracticePage';
import { AuthProvider } from '../../hooks/useAuth';
import { testBackend } from '../../test-utils';
import type { Backend } from '../../types/backend';

/** Page rendue pour un utilisateur connecté ; `backend` partagé pour simuler un retour sur la page. */
async function renderPage(backend?: Backend) {
  const b = backend ?? (await testBackend(true));
  const result = render(
    <AuthProvider backend={b}>
      <MemoryRouter>
        <PracticePage />
      </MemoryRouter>
    </AuthProvider>,
  );
  await screen.findByRole('region', { name: 'Exercice' });
  return { ...result, backend: b };
}

const exercise = () => screen.getByRole('region', { name: 'Exercice' });

beforeEach(() => localStorage.clear());

describe('PracticePage', () => {
  it('commence par un exercice « écrire la commande » de niveau débutant', async () => {
    await renderPage();
    expect(within(exercise()).getByText('Écrire la commande')).toBeInTheDocument();
    expect(within(exercise()).getByText('Débutant')).toBeInTheDocument();
  });

  it('corrige une réponse, puis l’accepte sous une forme équivalente', async () => {
    const user = userEvent.setup();
    const { backend } = await renderPage();
    await user.selectOptions(screen.getByLabelText('Catégorie'), 'files');
    // « Liste … format long, fichiers cachés » (2ᵉ exercice débutant de la catégorie)
    await user.type(screen.getByLabelText('Votre commande'), 'faux{Enter}'); // il faut répondre pour passer à la suite
    await user.click(screen.getByRole('button', { name: 'Suivant →' }));
    expect(screen.getByText(/format long, fichiers cachés compris/)).toBeInTheDocument();

    const input = screen.getByLabelText('Votre commande');
    await user.type(input, 'ls -l{Enter}');
    expect(screen.getByText('Il manque une option.')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'ls --all -l{Enter}');
    expect(screen.getByText('Bravo, c’est correct !')).toBeInTheDocument();
    expect(screen.getByText(/1/, { selector: 'strong' })).toBeInTheDocument();
    await waitFor(async () => expect(await backend.data.getProgress()).toContain('w-ls-la'));
  });

  it('indice et solution', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole('button', { name: 'Indice' }));
    expect(screen.getByText('Print Working Directory.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Indice' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Voir la solution' }));
    expect(screen.getByRole('link', { name: 'Comprendre la solution →' })).toBeInTheDocument();
  });

  it('QCM : mauvaise réponse puis nouvelle tentative', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole('tab', { name: 'Comprendre' }));
    const radios = screen.getAllByRole('radio');
    // Le premier QCM débutant est « rm -rf » : la bonne réponse est la première
    expect(screen.getByText('rm -rf /tmp/test')).toBeInTheDocument();
    await user.click(radios[1]!);
    expect(screen.getByText('Ce n’est pas ça.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    await user.click(screen.getAllByRole('radio')[0]!);
    expect(screen.getByText('Bonne réponse !')).toBeInTheDocument();
  });

  it('conversion de permissions', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole('tab', { name: 'Permissions' }));
    expect(screen.getByText('rw-r--r--')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Notation octale'), '640{Enter}');
    expect(screen.getByText('Pas tout à fait.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Notation octale'));
    await user.type(screen.getByLabelText('Notation octale'), '644{Enter}');
    expect(screen.getByText('Exact !')).toBeInTheDocument();
  });

  it('« Masquer les réussis » garde l’exercice en cours affiché', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByLabelText('Masquer les réussis'));
    await user.type(screen.getByLabelText('Votre commande'), 'pwd{Enter}');
    expect(screen.getByText('Bravo, c’est correct !')).toBeInTheDocument();
  });

  it('en revenant sur la page, reprend au même exercice avec les mêmes filtres', async () => {
    const user = userEvent.setup();
    const first = await renderPage();
    await user.selectOptions(screen.getByLabelText('Catégorie'), 'files');
    await user.type(screen.getByLabelText('Votre commande'), 'pwd{Enter}');
    await user.click(screen.getByRole('button', { name: 'Suivant →' }));
    await user.type(screen.getByLabelText('Votre commande'), 'ls -la{Enter}');
    await user.click(screen.getByRole('button', { name: 'Suivant →' }));
    const position = within(exercise()).getByText(/^\d+ \/ \d+$/).textContent;
    const prompt = within(exercise()).getByRole('paragraph', { name: '' }).textContent;
    first.unmount();

    await renderPage(first.backend);
    expect(screen.getByLabelText('Catégorie')).toHaveValue('files');
    expect(within(exercise()).getByText(position!)).toBeInTheDocument();
    expect(within(exercise()).getByRole('paragraph', { name: '' })).toHaveTextContent(prompt!);
  });

  it('reprend au même exercice même quand les réussis sont masqués', async () => {
    const user = userEvent.setup();
    const first = await renderPage();
    await user.click(screen.getByLabelText('Masquer les réussis'));
    await user.type(screen.getByLabelText('Votre commande'), 'pwd{Enter}'); // réussi, reste affiché
    await user.click(screen.getByRole('button', { name: 'Suivant →' }));
    await user.type(screen.getByLabelText('Votre commande'), 'faux{Enter}'); // répondu, mais pas réussi : reste dans la liste
    await user.click(screen.getByRole('button', { name: 'Suivant →' }));
    expect(within(exercise()).getByText(/^2 \/ \d+$/)).toBeInTheDocument();
    const position = within(exercise()).getByText(/^\d+ \/ \d+$/).textContent;
    first.unmount();

    await renderPage(first.backend);
    expect(screen.getByLabelText('Masquer les réussis')).toBeChecked();
    expect(within(exercise()).getByText(position!)).toBeInTheDocument();
  });

  it('on ne passe à la question suivante qu’après avoir répondu', async () => {
    const user = userEvent.setup();
    await renderPage();
    const next = screen.getByRole('button', { name: 'Suivant →' });
    expect(next).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Au hasard' })).toBeDisabled();
    expect(screen.getByText('Répondez pour passer à la suite')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Votre commande'), 'faux{Enter}'); // une mauvaise réponse suffit
    expect(next).toBeEnabled();
    expect(screen.queryByText('Répondez pour passer à la suite')).not.toBeInTheDocument();
    await user.click(next);
    expect(within(exercise()).getByText(/^2 \/ \d+$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suivant →' })).toBeDisabled();

    // Revenir en arrière reste possible, et un exercice déjà répondu ne bloque plus
    await user.click(screen.getByRole('button', { name: '← Précédent' }));
    expect(screen.getByRole('button', { name: 'Suivant →' })).toBeEnabled();
  });

  it('QCM : choisir une réponse débloque la suite', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole('tab', { name: 'Comprendre' }));
    expect(screen.getByRole('button', { name: 'Suivant →' })).toBeDisabled();
    await user.click(screen.getAllByRole('radio')[1]!);
    expect(screen.getByRole('button', { name: 'Suivant →' })).toBeEnabled();
  });

  it('position enregistrée illisible : repart du début', async () => {
    localStorage.setItem('linuxlens-practice-position', '{pas du json');
    await renderPage();
    expect(within(exercise()).getByText(/^1 \/ \d+$/)).toBeInTheDocument();
  });

  it('progression mémorisée dans le compte', async () => {
    const backend = await testBackend(true);
    await backend.data.addProgress(['w-pwd']);
    await renderPage(backend);
    expect(within(exercise()).getByText('✓ Réussi')).toBeInTheDocument();
  });

  it('sans compte : trois exercices d’essai, puis fenêtre d’invitation et inscription', async () => {
    const user = userEvent.setup();
    await renderGuest();
    await screen.findByRole('region', { name: 'Exercice' });
    for (let i = 0; i < 3; i++) {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await user.type(screen.getByLabelText('Votre commande'), 'faux{Enter}');
      await user.click(screen.getByRole('button', { name: 'Suivant →' }));
    }
    const dialog = await screen.findByRole('dialog', { name: 'Créez un compte pour continuer' });
    expect(screen.queryByRole('region', { name: 'Exercice' })).not.toBeInTheDocument(); // aperçu caché aux lecteurs d’écran
    expect(within(dialog).getByRole('link', { name: 'Créer un compte' })).toHaveFocus();
    expect(within(dialog).getByRole('link', { name: 'J’ai déjà un compte' })).toHaveAttribute('href', '/connexion?next=%2Fexercices');

    await user.tab();
    await user.tab();
    await user.tab();
    expect(within(dialog).getByRole('link', { name: 'Créer un compte' })).toHaveFocus(); // le focus reste dans la fenêtre

    await user.click(within(dialog).getByRole('link', { name: 'Créer un compte' }));
    expect(screen.getByText('Page d’inscription')).toBeInTheDocument();
  });

  it('sans compte : essais épuisés à une visite précédente : fenêtre dès l’arrivée, Échap ramène à l’accueil', async () => {
    const user = userEvent.setup();
    localStorage.setItem('linuxlens-guest-tried', JSON.stringify(['a', 'b', 'c']));
    await renderGuest();
    await screen.findByRole('dialog');
    expect(screen.queryByRole('region', { name: 'Exercice' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByText('Accueil')).toBeInTheDocument();
  });

  it('sans compte : le 3ᵉ exercice reste affiché avec sa correction', async () => {
    const user = userEvent.setup();
    localStorage.setItem('linuxlens-guest-tried', JSON.stringify(['a', 'b']));
    await renderGuest();
    await user.type(await screen.findByLabelText('Votre commande'), 'pwd{Enter}');
    expect(screen.getByText('Bravo, c’est correct !')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Suivant →' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Plus tard' }));
    expect(screen.getByText('Accueil')).toBeInTheDocument();
  });
});

async function renderGuest() {
  return testBackend().then((backend) =>
    render(
      <AuthProvider backend={backend}>
        <MemoryRouter initialEntries={['/exercices']}>
          <Routes>
            <Route path="/" element={<p>Accueil</p>} />
            <Route path="/exercices" element={<PracticePage />} />
            <Route path="/inscription" element={<p>Page d’inscription</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    ),
  );
}
