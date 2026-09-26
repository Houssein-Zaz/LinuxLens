import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ExplainPage } from '../ExplainPage';
import { AuthProvider } from '../../hooks/useAuth';
import { createDemoBackend } from '../../lib/backend/demo';
import { memoryStore } from '../../test-utils';

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('[]', { status: 404 }))));

const renderAt = (url = '/') =>
  render(
    <AuthProvider backend={createDemoBackend(memoryStore())}>
      <MemoryRouter initialEntries={[url]}>
        <ExplainPage />
      </MemoryRouter>
    </AuthProvider>,
  );

describe('ExplainPage', () => {
  it('propose des exemples quand le champ est vide', async () => {
    renderAt();
    await userEvent.click(screen.getByRole('button', { name: 'ls -la /home' }));
    expect(screen.getByRole('combobox')).toHaveValue('ls -la /home');
    expect(screen.getByRole('heading', { name: 'ls' })).toBeInTheDocument();
  });

  it('découpe la commande de l’URL et explique chaque segment', () => {
    renderAt('/?c=' + encodeURIComponent('ps aux | grep -i nginx'));
    const line = screen.getByLabelText('Commande découpée en éléments');
    expect(within(line).getAllByRole('button').map((b) => b.textContent)).toEqual(['ps', 'aux', '|', 'grep', '-i', 'nginx']);
    expect(screen.getByRole('heading', { name: 'ps' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'grep' })).toBeInTheDocument();
    expect(screen.getAllByText(/Ignore la casse/).length).toBeGreaterThan(0);
  });

  it('affiche les options groupées séparément', () => {
    renderAt('/?c=' + encodeURIComponent('ls -la'));
    const line = screen.getByLabelText('Commande découpée en éléments');
    expect(within(line).getAllByRole('button').map((b) => b.textContent)).toEqual(['ls', '-l', 'a']);
  });

  it('commande inconnue : découpage + message', () => {
    renderAt('/?c=' + encodeURIComponent('frobnicate --fast file'));
    expect(screen.getByText(/Aucune fiche pour/)).toBeInTheDocument();
    expect(screen.getAllByText('Option').length).toBeGreaterThan(0);
  });

  it('signale les erreurs de syntaxe', () => {
    renderAt('/?c=' + encodeURIComponent('echo "oups'));
    expect(screen.getByRole('alert')).toHaveTextContent('Guillemet double non fermé');
  });

  it('autocomplète le nom de commande au clavier', async () => {
    const user = userEvent.setup();
    renderAt();
    const input = screen.getByRole('combobox');
    await user.type(input, 'gr');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: /grep/ })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('grep ');
  });

  it('boîte de message : ouverte à la demande, commande jointe, confirmation', async () => {
    const user = userEvent.setup();
    renderAt('/?c=' + encodeURIComponent('parted -l'));
    await user.click(screen.getByRole('button', { name: 'Dites-le-nous' }));
    expect(screen.getByText('parted -l', { selector: 'code' })).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Envoyer' });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText(/Ce qui ne vous a pas plu/), 'Il manque des explications');
    await user.click(send);
    expect(await screen.findByRole('status')).toHaveTextContent('Merci');
  });
});
