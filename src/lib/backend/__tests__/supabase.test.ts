import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBackend, translateAuthError } from '../supabase';
import { createBackend, lazyBackend, projectUrl } from '..';
import { createDemoBackend } from '../demo';
import { memoryStore } from '../../../test-utils';

/** Faux client Supabase : enregistre les appels et renvoie les réponses programmées. */
function fakeClient(opts: { session?: { user: { id: string; email: string; user_metadata?: object } } | null } = {}) {
  const calls: unknown[][] = [];
  const responses: Record<string, unknown> = {};
  const query = (table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'order', 'limit', 'insert', 'upsert', 'delete', 'eq']) {
      chain[method] = (...args: unknown[]) => {
        calls.push([`${table}.${method}`, ...args]);
        return chain;
      };
    }
    chain.then = (resolve: (v: unknown) => void) => resolve(responses[table] ?? { data: [], error: null });
    return chain;
  };
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: opts.session ?? null } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
  };
  const client = { auth, from: vi.fn(query), rpc: vi.fn(async (..._args: unknown[]): Promise<{ data?: unknown; error: unknown }> => ({ error: null })) };
  return { client: client as unknown as SupabaseClient, auth, rpc: client.rpc, calls, responses };
}

const session = { user: { id: 'u1', email: 'sara@exemple.fr', user_metadata: { display_name: 'Sara' } } };

describe('translateAuthError', () => {
  it('traduit par code puis par message', () => {
    expect(translateAuthError({ message: 'x', code: 'invalid_credentials' })).toBe('E-mail ou mot de passe incorrect.');
    expect(translateAuthError({ message: 'Invalid login credentials' })).toBe('E-mail ou mot de passe incorrect.');
    expect(translateAuthError({ message: 'Email not confirmed' })).toMatch(/Confirmez/);
    expect(translateAuthError({ message: 'too many', status: 429 })).toMatch(/Trop de tentatives/);
    expect(translateAuthError({ message: 'Failed to fetch' })).toMatch(/joindre le serveur/);
    expect(translateAuthError({ message: 'bizarre' })).toMatch(/Une erreur est survenue/);
  });
});

describe('backend Supabase', () => {
  it('utilisateur courant tiré de la session', async () => {
    const { client } = fakeClient({ session });
    expect(await createSupabaseBackend(client).auth.getUser()).toEqual({ id: 'u1', email: 'sara@exemple.fr', displayName: 'Sara' });
  });

  it('inscription : e-mail normalisé, nom, lien de retour, confirmation demandée', async () => {
    const { client, auth } = fakeClient();
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
    const r = await createSupabaseBackend(client).auth.signUp(' Sara@Exemple.fr ', 'motdepasse1', 'Sara');
    expect(r).toEqual({ needsConfirmation: true });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'sara@exemple.fr',
      password: 'motdepasse1',
      options: { emailRedirectTo: expect.stringMatching(/\/connexion$/), data: { display_name: 'Sara' } },
    });
  });

  it('inscription : adresse déjà utilisée (utilisateur sans identité)', async () => {
    const { client, auth } = fakeClient();
    auth.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    expect((await createSupabaseBackend(client).auth.signUp('a@b.fr', 'motdepasse1')).error).toMatch(/existe déjà/);
  });

  it('inscription refusée localement si le mot de passe est faible (aucun appel réseau)', async () => {
    const { client, auth } = fakeClient();
    expect((await createSupabaseBackend(client).auth.signUp('a@b.fr', 'court')).error).toMatch(/8 caractères/);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('connexion : erreur traduite', async () => {
    const { client, auth } = fakeClient();
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials', code: 'invalid_credentials' } });
    expect(await createSupabaseBackend(client).auth.signIn('a@b.fr', 'x')).toEqual({ error: 'E-mail ou mot de passe incorrect.' });
  });

  it('réinitialisation : lien vers /nouveau-mot-de-passe', async () => {
    const { client, auth } = fakeClient();
    await createSupabaseBackend(client).auth.requestPasswordReset('a@b.fr');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.fr', { redirectTo: expect.stringMatching(/\/nouveau-mot-de-passe$/) });
  });

  it('jeton anti-robot transmis à l’inscription, la connexion et la réinitialisation', async () => {
    const { client, auth } = fakeClient();
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: {} }, error: null });
    auth.signInWithPassword.mockResolvedValue({ error: null });
    const b = createSupabaseBackend(client);

    await b.auth.signUp('a@b.fr', 'motdepasse1', undefined, 'jeton');
    expect(auth.signUp.mock.calls[0]![0].options).toMatchObject({ captchaToken: 'jeton' });
    await b.auth.signIn('a@b.fr', 'motdepasse1', 'jeton');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.fr', password: 'motdepasse1', options: { captchaToken: 'jeton' } });
    await b.auth.requestPasswordReset('a@b.fr', 'jeton');
    expect(auth.resetPasswordForEmail).toHaveBeenLastCalledWith('a@b.fr', expect.objectContaining({ captchaToken: 'jeton' }));
  });

  it('vérification anti-robot refusée : message en français', () => {
    expect(translateAuthError({ message: 'captcha protection: request disallowed (timeout-or-duplicate)' })).toMatch(/anti-robot/);
  });

  it('erreur d’authentification inconnue : signalée au journal ; erreur connue : non', async () => {
    const { client, auth, calls } = fakeClient();
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Database error granting user', status: 500 } });
    const b = createSupabaseBackend(client);
    expect(await b.auth.signIn('a@b.fr', 'motdepasse1')).toEqual({ error: expect.stringMatching(/Une erreur est survenue/) });
    await vi.waitFor(() =>
      expect(calls).toContainEqual(['error_logs.insert', expect.objectContaining({ source: 'auth', message: 'Connexion : Database error granting user' })]),
    );

    calls.length = 0;
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials', code: 'invalid_credentials' } });
    await b.auth.signIn('a@b.fr', 'motdepasse1');
    expect(calls.filter(([c]) => c === 'error_logs.insert')).toEqual([]);
  });

  it('journal : message tronqué, et jamais d’exception même si l’envoi échoue', async () => {
    const { client, calls } = fakeClient();
    const b = createSupabaseBackend(client);
    await b.monitoring.report({ source: 'page', message: 'x'.repeat(900) });
    const [, row] = calls.find(([c]) => c === 'error_logs.insert')! as [string, { message: string }];
    expect(row.message).toHaveLength(500);

    (client.from as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('réseau');
    });
    await expect(b.monitoring.report({ source: 'page', message: 'y' })).resolves.toBeUndefined();
  });

  it('message d’un visiteur : texte nettoyé et commande jointe ; échec signalé', async () => {
    const { client, calls, responses } = fakeClient();
    const b = createSupabaseBackend(client);
    expect(await b.monitoring.sendFeedback({ message: '  Explication manquante  ', command: ' parted -l ' })).toEqual({});
    expect(calls).toContainEqual(['feedback.insert', expect.objectContaining({ message: 'Explication manquante', command: 'parted -l' })]);

    expect(await b.monitoring.sendFeedback({ liked: ' Les exemples ', disliked: '', message: '' })).toEqual({});
    expect(calls).toContainEqual(['feedback.insert', expect.objectContaining({ liked: 'Les exemples', disliked: '', message: '' })]);

    expect(await b.monitoring.sendFeedback({ liked: ' ', disliked: '  ', message: '   ' })).toEqual({ error: 'Remplissez au moins un champ.' });
    responses.feedback = { data: null, error: { message: 'new row violates row-level security policy' } };
    expect(await b.monitoring.sendFeedback({ message: 'x' })).toEqual({ error: expect.stringMatching(/Une erreur est survenue/) });
  });

  it('mes messages : seulement les siens, réponses converties', async () => {
    const { client, calls, responses } = fakeClient({ session });
    responses.feedback = {
      data: [{ id: 3, liked: 'l', disliked: 'd', message: 'm', command: 'ls', created_at: 't', reply: 'r', replied_at: 't2' }],
      error: null,
    };
    expect(await createSupabaseBackend(client).data.getMyFeedback()).toEqual([
      { id: 3, liked: 'l', disliked: 'd', message: 'm', command: 'ls', createdAt: 't', reply: 'r', repliedAt: 't2' },
    ]);
    expect(calls).toContainEqual(['feedback.eq', 'user_id', 'u1']);
  });

  it('admin : fonctions SQL appelées et lignes converties', async () => {
    const { client, rpc } = fakeClient({ session });
    const responses: Record<string, unknown> = {
      is_admin: true,
      admin_overview: { users: 3, users_7d: 1, confirmed: 2, active_7d: 2, attempts: 10, attempts_7d: 4, correct_7d: 3, errors_7d: 0 },
      admin_users: [
        { id: 'u1', email: 'a@b.fr', display_name: null, created_at: 't', last_sign_in_at: null, confirmed: true, attempts: '12', solved: '5' },
      ],
      admin_errors: [{ id: 1, email: null, source: 'page', message: 'm', detail: 'd', path: '/', user_agent: 'ua', created_at: 't' }],
      admin_feedback: [
        { id: 2, email: 'a@b.fr', can_reply: true, liked: 'l', disliked: 'd', message: 'm', command: 'ls', path: '/', created_at: 't', reply: 'r', replied_at: 't2' },
      ],
    };
    rpc.mockImplementation(async (...args: unknown[]) => ({ data: responses[args[0] as string] ?? null, error: null }));
    const admin = createSupabaseBackend(client).admin!;

    expect(await admin.isAdmin()).toBe(true);
    expect(await admin.overview()).toMatchObject({ users: 3, usersLast7Days: 1, correctLast7Days: 3 });
    expect(await admin.users()).toEqual([
      { id: 'u1', email: 'a@b.fr', displayName: null, createdAt: 't', lastSignInAt: null, confirmed: true, attempts: 12, solved: 5 },
    ]);
    expect((await admin.errors())[0]).toMatchObject({ userAgent: 'ua', createdAt: 't' });
    expect(await admin.feedback()).toEqual([
      { id: 2, email: 'a@b.fr', canReply: true, liked: 'l', disliked: 'd', message: 'm', command: 'ls', path: '/', createdAt: 't', reply: 'r', repliedAt: 't2' },
    ]);
    await admin.replyFeedback(2, '  Merci !  ');
    expect(rpc).toHaveBeenCalledWith('admin_reply_feedback', { feedback_id: 2, reply_text: 'Merci !' });
    responses.admin_attempts = [{ user_id: 'u1', exercise_id: 'w-pwd', kind: 'write', correct: true, used_help: false, created_at: 't' }];
    expect(await admin.attempts(20)).toEqual([{ userId: 'u1', exerciseId: 'w-pwd', kind: 'write', correct: true, usedHelp: false, createdAt: 't' }]);
    expect(rpc).toHaveBeenCalledWith('admin_attempts', { max_rows: 20 });
  });

  it('admin : un refus de la base n’est jamais pris pour un accès', async () => {
    const { client, rpc } = fakeClient({ session });
    rpc.mockImplementation(async () => ({ data: null, error: { message: 'Accès réservé aux administrateurs' } }));
    const admin = createSupabaseBackend(client).admin!;
    expect(await admin.isAdmin()).toBe(false);
    await expect(admin.overview()).rejects.toThrow('Accès réservé');
  });

  it('suppression du compte via la fonction SQL delete_user', async () => {
    const { client, rpc, auth } = fakeClient({ session });
    expect(await createSupabaseBackend(client).auth.deleteAccount()).toEqual({});
    expect(rpc).toHaveBeenCalledWith('delete_user');
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('progression : lecture et ajout avec user_id', async () => {
    const { client, calls, responses } = fakeClient({ session });
    responses.exercise_progress = { data: [{ exercise_id: 'w-pwd' }], error: null };
    const b = createSupabaseBackend(client);
    expect(await b.data.getProgress()).toEqual(['w-pwd']);
    await b.data.addProgress(['w-ls-la']);
    expect(calls).toContainEqual([
      'exercise_progress.upsert',
      [{ user_id: 'u1', exercise_id: 'w-ls-la' }],
      { onConflict: 'user_id,exercise_id', ignoreDuplicates: true },
    ]);
  });

  it('essais : insertion avec user_id, lecture convertie, effacés avec la progression', async () => {
    const { client, calls, responses } = fakeClient({ session });
    const b = createSupabaseBackend(client);
    await b.data.addAttempt({ exerciseId: 'q-1', kind: 'quiz', correct: false, answer: 'x'.repeat(300), usedHelp: false });
    expect(calls).toContainEqual([
      'exercise_attempts.insert',
      { user_id: 'u1', exercise_id: 'q-1', kind: 'quiz', correct: false, answer: 'x'.repeat(200), used_help: false },
    ]);

    responses.exercise_attempts = {
      data: [{ exercise_id: 'q-1', kind: 'quiz', correct: true, answer: 'b', used_help: false, created_at: '2026-09-26T10:00:00Z' }],
      error: null,
    };
    expect(await b.data.getAttempts()).toEqual([
      { exerciseId: 'q-1', kind: 'quiz', correct: true, answer: 'b', usedHelp: false, createdAt: '2026-09-26T10:00:00Z' },
    ]);
    expect(calls).toContainEqual(['exercise_attempts.limit', 1000]);

    await b.data.clearProgress();
    expect(calls).toContainEqual(['exercise_attempts.delete']);
    expect(calls).toContainEqual(['exercise_attempts.eq', 'user_id', 'u1']);
  });

  it('favoris et historique', async () => {
    const { client, calls, responses } = fakeClient({ session });
    const b = createSupabaseBackend(client);
    await b.data.setFavorite('tar', false);
    expect(calls).toContainEqual(['favorites.eq', 'command', 'tar']);
    responses.history = { data: [{ command: 'ls', created_at: '2024-07-12T19:14:05Z' }], error: null };
    expect(await b.data.getHistory(10)).toEqual([{ command: 'ls', createdAt: '2024-07-12T19:14:05Z' }]);
    expect(calls).toContainEqual(['history.limit', 10]);
  });

  it('les erreurs de la base remontent', async () => {
    const { client, responses } = fakeClient({ session });
    responses.favorites = { data: null, error: { message: 'permission denied' } };
    await expect(createSupabaseBackend(client).data.getFavorites()).rejects.toThrow('permission denied');
  });

  it('données impossibles sans session', async () => {
    const { client } = fakeClient();
    await expect(createSupabaseBackend(client).data.addHistory('ls')).rejects.toThrow('Non connecté');
  });
});

describe('createBackend', () => {
  it('mode démo sans configuration, Supabase avec', () => {
    expect(createBackend({}).mode).toBe('demo');
    expect(createBackend({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'cle' }).mode).toBe('supabase');
  });
});

describe('projectUrl', () => {
  it('ne garde que l’adresse de base du projet', () => {
    expect(projectUrl('https://abc.supabase.co/rest/v1/')).toBe('https://abc.supabase.co');
    expect(projectUrl(' https://abc.supabase.co/ ')).toBe('https://abc.supabase.co');
    expect(projectUrl('https://abc.supabase.co')).toBe('https://abc.supabase.co');
  });
});

describe('lazyBackend', () => {
  it('ne charge le vrai backend qu’au premier appel, une seule fois', async () => {
    const real = createDemoBackend(memoryStore());
    const load = vi.fn(() => Promise.resolve(real));
    const backend = lazyBackend('supabase', load);
    expect(load).not.toHaveBeenCalled();

    await backend.auth.signUp('sara@exemple.fr', 'motdepasse1');
    await backend.data.setFavorite('ls', true);
    expect(await backend.data.getFavorites()).toEqual(['ls']);
    expect(await backend.auth.getUser()).toMatchObject({ email: 'sara@exemple.fr' });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('onChange s’abonne après le chargement et se désabonne', async () => {
    const backend = lazyBackend('supabase', () => Promise.resolve(createDemoBackend(memoryStore())));
    const listener = vi.fn();
    const unsubscribe = backend.auth.onChange(listener);
    await backend.auth.signUp('sara@exemple.fr', 'motdepasse1');
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ email: 'sara@exemple.fr' }));

    unsubscribe();
    listener.mockClear();
    await backend.auth.signOut();
    expect(listener).not.toHaveBeenCalled();
  });

  it('n’est pas pris pour une promesse', async () => {
    const backend = lazyBackend('supabase', () => Promise.resolve(createDemoBackend(memoryStore())));
    expect(await Promise.resolve(backend.auth)).toBe(backend.auth);
  });
});
