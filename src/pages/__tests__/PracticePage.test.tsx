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
    await user.click(screen.getByRole('button', { name: 'Suivant →' }));
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
    await user.click(screen.getByRole('button', { name: 'Suivant →' }));
    expect(within(exercise()).getByText(/^2 \/ \d+$/)).toBeInTheDocument();
    const position = within(exercise()).getByText(/^\d+ \/ \d+$/).textContent;
    first.unmount();

    await renderPage(first.backend);
    expect(screen.getByLabelText('Masquer les réussis')).toBeChecked();
    expect(within(exercise()).getByText(position!)).toBeInTheDocument();
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

  it('sans compte : fenêtre d’invitation devant un aperçu inerte, puis inscription', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider backend={await testBackend()}>
        <MemoryRouter initialEntries={['/exercices']}>
          <Routes>
            <Route path="/" element={<p>Accueil</p>} />
            <Route path="/exercices" element={<PracticePage />} />
            <Route path="/inscription" element={<p>Page d’inscription</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    const dialog = await screen.findByRole('dialog', { name: 'Créez un compte pour faire les exercices' });
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

  it('sans compte : « Plus tard » ou Échap ramène à l’accueil', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider backend={await testBackend()}>
        <MemoryRouter initialEntries={['/exercices']}>
          <Routes>
            <Route path="/" element={<p>Accueil</p>} />
            <Route path="/exercices" element={<PracticePage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(screen.getByText('Accueil')).toBeInTheDocument();
  });
});
