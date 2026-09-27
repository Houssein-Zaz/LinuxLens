import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from './App';
import { initialLang, labels, setCurrentLang, tr, withEnglish } from './i18n';
import { createDemoBackend } from './lib/backend/demo';
import { checkCommand } from './lib/exercise';
import { explainSegment } from './lib/explain';
import { parseLsLine } from './lib/lsl';
import { parseCommandLine } from './lib/parser';
import { describeSymbolicMode } from './lib/permissions';
import { getCommand, registrySpec } from './lib/registry';
import { EXERCISE_BY_ID } from './data/exercises';
import { CATEGORY_BY_ID } from './data/categories';
import { loadEnglishCommands } from './data';
import { memoryStore } from './test-utils';

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 404 }))));

const renderApp = (url = '/', lang?: 'fr' | 'en') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App backend={createDemoBackend(memoryStore())} {...(lang && { lang })} />
    </MemoryRouter>,
  );

const explain = (line: string) => explainSegment(parseCommandLine(line, registrySpec).segments[0]!).map((e) => e.text);

describe('outils de traduction', () => {
  it('tr, labels et withEnglish suivent la langue courante', () => {
    const table = labels({ yes: ['Oui', 'Yes'] });
    const data = withEnglish({ id: 1, title: 'Bonjour' }, { title: 'Hello' });
    expect([tr('Oui', 'Yes'), table.yes, data.title]).toEqual(['Oui', 'Oui', 'Bonjour']);
    setCurrentLang('en');
    expect([tr('Oui', 'Yes'), table.yes, data.title, data.id]).toEqual(['Yes', 'Yes', 'Hello', 1]);
  });

  it('langue de départ : choix enregistré, sinon celle du navigateur', () => {
    expect(initialLang()).toBe('fr'); // navigateur en français (test-setup)
    localStorage.setItem('linuxlens-lang', 'en');
    expect(initialLang()).toBe('en');
    localStorage.removeItem('linuxlens-lang');
    const languages = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE']);
    expect(initialLang()).toBe('en'); // ni français ni anglais : anglais
    languages.mockRestore();
  });
});

describe('contenu en anglais', () => {
  beforeAll(() => loadEnglishCommands());
  beforeEach(() => setCurrentLang('en'));

  it('explications, fiches et exemples', () => {
    expect(getCommand('ls')!.summary).toBe('Lists the contents of a directory.');
    expect(explain('ls -la > out.txt')).toEqual([
      'Lists the contents of a directory.',
      'Long format: type and permissions, number of links, owner, group, size, modification date and name.',
      'Also shows hidden files, including “.” (current directory) and “..” (parent directory).',
      'Writes standard output (stdout) to a file, replacing its contents (the file is created if it does not exist).',
      'File “out.txt” used by the redirection.',
    ]);
    expect(describeSymbolicMode('go-w')).toBe('Removes write for the group and others.');
    expect(parseCommandLine('echo "abc').errors[0]!.message).toBe('Unclosed double quote');
  });

  it('correction des exercices et analyseur ls -l', () => {
    expect(checkCommand('ls -l', ['ls -la'])).toEqual({ ok: false, messages: ['An option is missing.'] });
    const line = parseLsLine('-rw-r--r-- 1 esprit esprit 47 Jul 12 21:14 notes.txt');
    expect(line.type === 'entry' && line.fields.map((f) => f.label)).toContain('Owner');
  });

  it('exercices et catégories', () => {
    const quiz = EXERCISE_BY_ID.get('q-and');
    expect(quiz?.kind === 'quiz' && quiz.question).toBe('When does cd projet run?');
    expect(CATEGORY_BY_ID.files.label).toBe('Files and directories');
    setCurrentLang('fr');
    expect(quiz?.kind === 'quiz' && quiz.question).toBe('Quand cd projet s’exécute-t-il ?');
  });
});

describe('choix de la langue dans le site', () => {
  it('le bouton EN passe tout le site en anglais, et le choix est retenu', async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp('/?c=ls%20-la');
    expect(screen.getByRole('heading', { level: 1, name: 'Comprendre une commande Linux' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('fr');

    await user.click(within(screen.getByRole('group', { name: 'Langue' })).getByRole('button', { name: 'English' }));
    // Le site bascule une fois les fiches anglaises téléchargées
    expect(await screen.findByRole('heading', { level: 1, name: 'Understand a Linux command' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    // Les explications déjà affichées changent de langue elles aussi
    expect(screen.getAllByText('Lists the contents of a directory.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.lang).toBe('en');
    await waitFor(() => expect(document.title).toBe('LinuxLens — Linux commands explained'));
    expect(localStorage.getItem('linuxlens-lang')).toBe('en');
    unmount();

    // Visite suivante : la langue choisie est reprise
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Understand a Linux command' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Français' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Comprendre une commande Linux' })).toBeInTheDocument();
  });

  it('exercices en anglais', async () => {
    renderApp('/exercices', 'en');
    expect(await screen.findByRole('heading', { level: 1, name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByText('Print the full path of the current directory.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next →' })).toBeDisabled();
  });

  it('fiche de commande en anglais', async () => {
    renderApp('/commande/tar', 'en');
    expect(await screen.findByText('Creates or extracts .tar, .tar.gz and .tar.xz archives.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Examples' })).toBeInTheDocument();
  });

  it('mentions légales en anglais', async () => {
    renderApp('/mentions-legales', 'en');
    expect(await screen.findByRole('heading', { level: 1, name: 'Legal notice' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hosting' })).toBeInTheDocument();
  });
});
