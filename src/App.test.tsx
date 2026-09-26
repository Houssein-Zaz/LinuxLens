import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from './App';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { createDemoBackend } from './lib/backend/demo';
import { memoryStore } from './test-utils';

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 404 }))));

const renderApp = (url = '/') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App backend={createDemoBackend(memoryStore())} />
    </MemoryRouter>,
  );

describe('App', () => {
  it('affiche la navigation principale', () => {
    renderApp();
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorer' })).toHaveAttribute('href', '/explorer');
  });

  it('donne un titre d’onglet à chaque page', async () => {
    renderApp();
    await waitFor(() => expect(document.title).toBe('LinuxLens — les commandes Linux expliquées'));
  });

  it('mentions légales accessibles depuis le pied de page', async () => {
    renderApp('/mentions-legales');
    expect(await screen.findByRole('heading', { level: 1, name: 'Mentions légales' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hébergement' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mentions légales' })).toHaveAttribute('href', '/mentions-legales');
  });

  it('charge les pages à la demande, titre compris', async () => {
    renderApp('/commande/chmod');
    expect(await screen.findByRole('heading', { level: 1, name: 'chmod' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toMatch(/^chmod : .+ — LinuxLens$/));
  });
});

describe('ErrorBoundary', () => {
  function Broken(): never {
    throw new Error('boum');
  }

  it('remplace une page qui plante par un message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Broken />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Une erreur est survenue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
    spy.mockRestore();
  });
});
