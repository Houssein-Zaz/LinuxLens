import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LsPage } from '../LsPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <LsPage />
    </MemoryRouter>,
  );

describe('LsPage', () => {
  it('analyse la ligne d’exemple par défaut', () => {
    renderPage();
    expect(screen.getByText('664')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Propriétaire : esprit' })).toBeInTheDocument();
    expect(screen.getByText('chmod 664 fichier1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /calculateur/ })).toHaveAttribute('href', '/chmod?mode=664');
  });

  it('met à jour à la saisie et signale les lignes invalides', () => {
    renderPage();
    const textarea = screen.getByLabelText('Sortie de ls -l');
    fireEvent.change(textarea, { target: { value: 'pas une ligne ls' } });
    expect(screen.getByRole('alert')).toHaveTextContent('premier bloc');
  });

  it('charge un exemple de lien symbolique', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Lien symbolique' }));
    expect(screen.getByRole('button', { name: 'Cible du lien : usr/bin' })).toBeInTheDocument();
  });
});
