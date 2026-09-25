import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { CommandPage } from '../CommandPage';
import { ExplainPage } from '../ExplainPage';
import type { TldrDoc, TldrIndexEntry } from '../../types/command';

const INDEX: TldrIndexEntry[] = [{ name: 'rsync', summary: 'Transférer des fichiers vers ou depuis un hôte distant.', lang: 'fr' }];
const RSYNC: TldrDoc = {
  name: 'rsync',
  summary: 'Transférer des fichiers vers ou depuis un hôte distant.',
  examples: [{ description: 'Transfère un fichier', command: 'rsync chemin/vers/origine chemin/vers/destination' }],
  lang: 'fr',
  platform: 'common',
  sourceUrl: 'https://github.com/tldr-pages/tldr/blob/main/pages.fr/common/rsync.md',
};

const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
vi.stubGlobal(
  'fetch',
  vi.fn((url: string) => {
    if (url === '/tldr/index.json') return Promise.resolve(json(INDEX));
    if (url === '/tldr/pages/rsync.json') return Promise.resolve(json(RSYNC));
    return Promise.resolve(new Response('<html>', { headers: { 'content-type': 'text/html' } }));
  }),
);

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<ExplainPage />} />
        <Route path="/commande/:name" element={<CommandPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('repli sur tldr-pages', () => {
  it('fiche tldr avec mention de la source et de la licence', async () => {
    renderAt('/commande/rsync');
    expect(await screen.findByRole('heading', { level: 1, name: 'rsync' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'tldr-pages' })).toHaveAttribute('href', RSYNC.sourceUrl);
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeInTheDocument();
    expect(screen.getByText('Transfère un fichier')).toBeInTheDocument();
  });

  it('une page absente (réponse HTML) donne « aucune fiche »', async () => {
    renderAt('/commande/inconnue');
    expect(await screen.findByText(/Aucune fiche/)).toBeInTheDocument();
  });

  it('la page Expliquer utilise le résumé tldr', async () => {
    renderAt('/?c=' + encodeURIComponent('rsync -a src/ dst/'));
    expect(await screen.findAllByText('Transférer des fichiers vers ou depuis un hôte distant.')).not.toHaveLength(0);
    expect(screen.queryByText(/Aucune fiche pour/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fiche rsync →' })).toBeInTheDocument();
  });
});
