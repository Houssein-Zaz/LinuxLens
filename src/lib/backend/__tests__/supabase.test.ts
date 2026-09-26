import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBackend, translateAuthError } from '../supabase';
import { createBackend } from '..';

/** Faux client Supabase : enregistre les appels et renvoie les réponses programmées. */
function fakeClient(opts: { session?: { user: { id: string; email: string; user_metadata?: object } } | null } = {}) {
  const calls: unknown[][] = [];
  const responses: Record<string, unknown> = {};
  const query = (table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'order', 'limit', 'upsert', 'delete', 'eq']) {
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
  const client = { auth, from: vi.fn(query), rpc: vi.fn(async () => ({ error: null })) };
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
