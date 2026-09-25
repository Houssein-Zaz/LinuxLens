import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { PracticePage } from '../PracticePage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <PracticePage />
    </MemoryRouter>,
  );

const exercise = () => screen.getByRole('region', { name: 'Exercice' });

beforeEach(() => localStorage.clear());

describe('PracticePage', () => {
  it('commence par un exercice « écrire la commande » de niveau débutant', () => {
    renderPage();
    expect(within(exercise()).getByText('Écrire la commande')).toBeInTheDocument();
    expect(within(exercise()).getByText('Débutant')).toBeInTheDocument();
  });

  it('corrige une réponse, puis l’accepte sous une forme équivalente', async () => {
    const user = userEvent.setup();
    renderPage();
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
    expect(JSON.parse(localStorage.getItem('linuxlens-progress')!)).toContain('w-ls-la');
  });

  it('indice et solution', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Indice' }));
    expect(screen.getByText('Print Working Directory.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Indice' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Voir la solution' }));
    expect(screen.getByRole('link', { name: 'Comprendre la solution →' })).toBeInTheDocument();
  });

  it('QCM : mauvaise réponse puis nouvelle tentative', async () => {
    const user = userEvent.setup();
    renderPage();
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
    renderPage();
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
    renderPage();
    await user.click(screen.getByLabelText('Masquer les réussis'));
    await user.type(screen.getByLabelText('Votre commande'), 'pwd{Enter}');
    expect(screen.getByText('Bravo, c’est correct !')).toBeInTheDocument();
  });

  it('progression mémorisée entre deux visites', () => {
    localStorage.setItem('linuxlens-progress', JSON.stringify(['w-pwd']));
    renderPage();
    expect(within(exercise()).getByText('✓ Réussi')).toBeInTheDocument();
  });
});
