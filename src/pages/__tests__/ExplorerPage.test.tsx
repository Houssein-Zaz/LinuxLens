import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ExplorerPage } from '../ExplorerPage';
import { CommandPage } from '../CommandPage';
import { AuthProvider } from '../../hooks/useAuth';
import { createDemoBackend } from '../../lib/backend/demo';
import { memoryStore } from '../../test-utils';

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 404 }))));

const renderAt = (url: string) =>
  render(
    <AuthProvider backend={createDemoBackend(memoryStore())}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/commande/:name" element={<CommandPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

describe('ExplorerPage', () => {
  it('liste les commandes par catégorie', () => {
    renderAt('/explorer');
    expect(screen.getByRole('heading', { name: 'Fichiers et répertoires' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^ls/ })).toHaveAttribute('href', '/commande/ls');
  });

  it('filtre par nom ou description, sans accents', async () => {
    renderAt('/explorer');
    await userEvent.type(screen.getByRole('searchbox'), 'repertoire');
    expect(screen.getByRole('link', { name: /^mkdir/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^grep/ })).not.toBeInTheDocument();
  });

  it('aucun résultat : propose d’analyser', async () => {
    renderAt('/explorer?q=zzzz');
    expect(screen.getByText(/Aucune commande/)).toBeInTheDocument();
  });
});

describe('CommandPage', () => {
  it('affiche une fiche détaillée', () => {
    renderAt('/commande/tar');
    expect(screen.getByRole('heading', { level: 1, name: 'tar' })).toBeInTheDocument();
    expect(screen.getByText('-f, --file')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Expliquer' })[0]).toHaveAttribute(
      'href',
      '/?c=' + encodeURIComponent('tar -czvf projet.tar.gz projet/'),
    );
    expect(screen.getByRole('note')).toHaveTextContent('Attention');
  });

  it('commande inconnue', async () => {
    renderAt('/commande/inexistante');
    expect(await screen.findByText(/Aucune fiche/)).toBeInTheDocument();
  });
});
