import { createDemoBackend, type KeyValueStore } from '../demo';

function memoryStore(): KeyValueStore & { dump(): Record<string, string> } {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

describe('backend démo', () => {
  it('inscription, connexion automatique, déconnexion, reconnexion', async () => {
    const b = createDemoBackend(memoryStore());
    const seen: Array<string | null> = [];
    b.auth.onChange((u) => seen.push(u?.email ?? null));

    expect(await b.auth.signUp('Sara@Exemple.fr', 'motdepasse1', 'Sara')).toEqual({});
    expect(await b.auth.getUser()).toMatchObject({ email: 'sara@exemple.fr', displayName: 'Sara' });

    await b.auth.signOut();
    expect(await b.auth.getUser()).toBeNull();

    expect(await b.auth.signIn('sara@exemple.fr', 'mauvais1')).toEqual({ error: 'E-mail ou mot de passe incorrect.' });
    expect(await b.auth.signIn(' SARA@exemple.fr ', 'motdepasse1')).toEqual({});
    expect(seen).toEqual(['sara@exemple.fr', null, 'sara@exemple.fr']);
  });

  it('ne stocke jamais le mot de passe en clair', async () => {
    const store = memoryStore();
    await createDemoBackend(store).auth.signUp('a@b.fr', 'secret123');
    expect(JSON.stringify(store.dump())).not.toContain('secret123');
  });

  it('valide e-mail et mot de passe, refuse les doublons', async () => {
    const b = createDemoBackend(memoryStore());
    expect((await b.auth.signUp('pas-un-email', 'motdepasse1')).error).toMatch(/pas valide/);
    expect((await b.auth.signUp('a@b.fr', 'court1')).error).toMatch(/8 caractères/);
    expect((await b.auth.signUp('a@b.fr', 'sanschiffre')).error).toMatch(/un chiffre/);
    await b.auth.signUp('a@b.fr', 'motdepasse1');
    expect((await b.auth.signUp('A@b.fr', 'motdepasse2')).error).toMatch(/existe déjà/);
  });

  it('données propres à chaque utilisateur', async () => {
    const store = memoryStore();
    const b = createDemoBackend(store);
    await b.auth.signUp('a@b.fr', 'motdepasse1');
    await b.data.addProgress(['w-pwd', 'w-ls-la']);
    await b.data.addProgress(['w-pwd']);
    await b.data.setFavorite('tar', true);
    await b.data.addHistory('ls -la');
    await b.data.addHistory('pwd');
    await b.data.addHistory('ls -la');
    expect(await b.data.getProgress()).toEqual(['w-pwd', 'w-ls-la']);
    expect(await b.data.getFavorites()).toEqual(['tar']);
    expect((await b.data.getHistory()).map((h) => h.command)).toEqual(['ls -la', 'pwd']);

    await b.auth.signUp('c@d.fr', 'motdepasse1');
    expect(await b.data.getProgress()).toEqual([]);
    expect(await b.data.getFavorites()).toEqual([]);
  });

  it('favoris : retrait ; effacements', async () => {
    const b = createDemoBackend(memoryStore());
    await b.auth.signUp('a@b.fr', 'motdepasse1');
    await b.data.setFavorite('ls', true);
    await b.data.setFavorite('ls', false);
    expect(await b.data.getFavorites()).toEqual([]);
    await b.data.addProgress(['x']);
    await b.data.clearProgress();
    await b.data.addHistory('ls');
    await b.data.clearHistory();
    expect(await b.data.getProgress()).toEqual([]);
    expect(await b.data.getHistory()).toEqual([]);
  });

  it('profil, mot de passe et suppression du compte', async () => {
    const store = memoryStore();
    const b = createDemoBackend(store);
    await b.auth.signUp('a@b.fr', 'motdepasse1');
    await b.auth.updateProfile('Ali');
    expect((await b.auth.getUser())?.displayName).toBe('Ali');

    await b.auth.updatePassword('nouveau123');
    await b.auth.signOut();
    expect((await b.auth.signIn('a@b.fr', 'motdepasse1')).error).toBeDefined();
    expect(await b.auth.signIn('a@b.fr', 'nouveau123')).toEqual({});

    await b.data.addProgress(['x']);
    expect(await b.auth.deleteAccount()).toEqual({});
    expect(await b.auth.getUser()).toBeNull();
    expect(Object.keys(store.dump()).some((k) => k.startsWith('linuxlens-demo-data:'))).toBe(false);
    expect((await b.auth.signIn('a@b.fr', 'nouveau123')).error).toBeDefined();
  });

  it('pas de réinitialisation par e-mail en mode démo', async () => {
    expect((await createDemoBackend(memoryStore()).auth.requestPasswordReset('a@b.fr')).error).toMatch(/mode démo/);
  });

  it('les données exigent une connexion', async () => {
    await expect(createDemoBackend(memoryStore()).data.getProgress()).rejects.toThrow('Non connecté');
  });
});
