import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ChmodPage } from '../ChmodPage';

const renderAt = (url = '/chmod') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ChmodPage />
    </MemoryRouter>,
  );

const symbolicField = () => screen.getByLabelText('Notation symbolique');
const octalField = () => screen.getByLabelText('Notation octale');

describe('ChmodPage', () => {
  it('part de 644 par défaut, ou du mode de l’URL', () => {
    renderAt();
    expect(octalField()).toHaveValue('644');
    expect(symbolicField()).toHaveValue('rw-r--r--');
  });

  it('lit ?mode= dans l’URL', () => {
    renderAt('/chmod?mode=750');
    expect(symbolicField()).toHaveValue('rwxr-x---');
    expect(screen.getByText(/chmod 750 fichier/)).toBeInTheDocument();
  });

  it('grille → notations', async () => {
    renderAt();
    await userEvent.click(screen.getByLabelText('exécution pour propriétaire'));
    expect(octalField()).toHaveValue('744');
    expect(symbolicField()).toHaveValue('rwxr--r--');
    expect(screen.getByText('u=rwx,g=r,o=r', { exact: false })).toBeInTheDocument();
  });

  it('octal → grille et symbolique', async () => {
    renderAt();
    await userEvent.clear(octalField());
    await userEvent.type(octalField(), '750');
    expect(symbolicField()).toHaveValue('rwxr-x---');
    expect(screen.getByLabelText('écriture pour groupe')).not.toBeChecked();
    expect(screen.getByLabelText('exécution pour groupe')).toBeChecked();
  });

  it('symbolique → octal ; une saisie invalide ne casse rien', async () => {
    renderAt();
    await userEvent.clear(symbolicField());
    expect(symbolicField()).toHaveAttribute('aria-invalid', 'true');
    expect(octalField()).toHaveValue('644');
    await userEvent.type(symbolicField(), 'rwx------');
    expect(octalField()).toHaveValue('700');
    expect(symbolicField()).toHaveAttribute('aria-invalid', 'false');
  });

  it('bits spéciaux', async () => {
    renderAt('/chmod?mode=755');
    await userEvent.click(screen.getByText('Bits spéciaux (setuid, setgid, sticky)'));
    await userEvent.click(screen.getByLabelText(/setuid \(4000\)/));
    expect(octalField()).toHaveValue('4755');
    expect(symbolicField()).toHaveValue('rwsr-xr-x');
  });

  it('tester puis appliquer un mode symbolique', async () => {
    renderAt();
    await userEvent.type(screen.getByLabelText('Mode chmod à tester'), 'u+x');
    expect(screen.getByText("Ajoute l'exécution pour le propriétaire.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Appliquer' }));
    expect(octalField()).toHaveValue('744');
  });
});
