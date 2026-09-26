import type { Attempt, Backend, HistoryEntry, User } from '../../types/backend';
import { ANSWER_MAX_LENGTH, ATTEMPTS_LIMIT, HISTORY_LIMIT, normalizeEmail, validateEmail, validatePassword } from './validation';

/*
 * Backend de démonstration : comptes et données dans le stockage du navigateur.
 * Utilisé tant que Supabase n'est pas configuré. Rien ne quitte l'appareil ;
 * les mots de passe sont tout de même hachés (SHA-256 salé) plutôt que stockés en clair.
 */

interface StoredUser extends User {
  salt: string;
  hash: string;
}

interface UserData {
  progress: string[];
  favorites: string[];
  history: HistoryEntry[];
  /** Plus récents d'abord. Absent des données enregistrées avant l'ajout des essais. */
  attempts?: Attempt[];
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const USERS_KEY = 'linuxlens-demo-users';
const SESSION_KEY = 'linuxlens-demo-session';
const dataKey = (id: string) => `linuxlens-demo-data:${id}`;

/** localStorage, sans planter en navigation privée ou si le stockage est bloqué. */
export const safeLocalStorage: KeyValueStore = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // stockage indisponible
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // stockage indisponible
    }
  },
};

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

const publicUser = ({ id, email, displayName }: StoredUser): User => ({ id, email, displayName });

export function createDemoBackend(store: KeyValueStore = safeLocalStorage): Backend {
  const listeners = new Set<(user: User | null) => void>();

  const readJson = <T>(key: string, fallback: T): T => {
    try {
      const raw = store.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const users = () => readJson<Record<string, StoredUser>>(USERS_KEY, {});
  const saveUsers = (u: Record<string, StoredUser>) => store.setItem(USERS_KEY, JSON.stringify(u));
  const current = (): StoredUser | null => {
    const id = store.getItem(SESSION_KEY);
    return (id && Object.values(users()).find((u) => u.id === id)) || null;
  };
  const emit = () => {
    const u = current();
    for (const l of listeners) l(u && publicUser(u));
  };

  const requireUser = () => {
    const u = current();
    if (!u) throw new Error('Non connecté');
    return u;
  };
  const readData = (id: string) => readJson<UserData>(dataKey(id), { progress: [], favorites: [], history: [] });
  const updateData = (fn: (d: UserData) => void) => {
    const { id } = requireUser();
    const d = readData(id);
    fn(d);
    store.setItem(dataKey(id), JSON.stringify(d));
  };

  return {
    mode: 'demo',
    auth: {
      async getUser() {
        const u = current();
        return u && publicUser(u);
      },
      onChange(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async signUp(email, password, displayName) {
        const error = validateEmail(email) ?? validatePassword(password);
        if (error) return { error };
        const key = normalizeEmail(email);
        const all = users();
        if (all[key]) return { error: 'Un compte existe déjà avec cette adresse e-mail.' };
        const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
        all[key] = {
          id: crypto.randomUUID(),
          email: key,
          displayName: displayName?.trim() || null,
          salt,
          hash: await hashPassword(password, salt),
        };
        saveUsers(all);
        store.setItem(SESSION_KEY, all[key].id);
        emit();
        return {};
      },
      async signIn(email, password) {
        const u = users()[normalizeEmail(email)];
        if (!u || (await hashPassword(password, u.salt)) !== u.hash) {
          return { error: 'E-mail ou mot de passe incorrect.' };
        }
        store.setItem(SESSION_KEY, u.id);
        emit();
        return {};
      },
      async signOut() {
        store.removeItem(SESSION_KEY);
        emit();
      },
      async requestPasswordReset(email) {
        return validateEmail(email)
          ? { error: validateEmail(email)! }
          : { error: 'En mode démo, aucun e-mail n’est envoyé : la réinitialisation sera disponible avec la base de données.' };
      },
      async updatePassword(password) {
        const error = validatePassword(password);
        if (error) return { error };
        const u = current();
        if (!u) return { error: 'Vous devez être connecté.' };
        const all = users();
        const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
        all[u.email] = { ...u, salt, hash: await hashPassword(password, salt) };
        saveUsers(all);
        return {};
      },
      async updateProfile(displayName) {
        const u = current();
        if (!u) return { error: 'Vous devez être connecté.' };
        const all = users();
        all[u.email] = { ...u, displayName: displayName.trim() || null };
        saveUsers(all);
        emit();
        return {};
      },
      async deleteAccount() {
        const u = current();
        if (!u) return { error: 'Vous devez être connecté.' };
        const all = users();
        delete all[u.email];
        saveUsers(all);
        store.removeItem(dataKey(u.id));
        store.removeItem(SESSION_KEY);
        emit();
        return {};
      },
    },
    data: {
      async getProgress() {
        return readData(requireUser().id).progress;
      },
      async addProgress(ids) {
        updateData((d) => {
          d.progress = [...new Set([...d.progress, ...ids])];
        });
      },
      async clearProgress() {
        updateData((d) => {
          d.progress = [];
          d.attempts = [];
        });
      },
      async addAttempt(attempt) {
        updateData((d) => {
          const entry = { ...attempt, answer: attempt.answer.slice(0, ANSWER_MAX_LENGTH), createdAt: new Date().toISOString() };
          d.attempts = [entry, ...(d.attempts ?? [])].slice(0, ATTEMPTS_LIMIT);
        });
      },
      async getAttempts() {
        return readData(requireUser().id).attempts ?? [];
      },
      async getFavorites() {
        return readData(requireUser().id).favorites;
      },
      async setFavorite(command, favorite) {
        updateData((d) => {
          d.favorites = favorite ? [...new Set([...d.favorites, command])] : d.favorites.filter((c) => c !== command);
        });
      },
      async getHistory(limit = HISTORY_LIMIT) {
        return readData(requireUser().id).history.slice(0, limit);
      },
      async addHistory(command) {
        updateData((d) => {
          // plus récent d'abord, sans doublon
          d.history = [{ command, createdAt: new Date().toISOString() }, ...d.history.filter((h) => h.command !== command)].slice(
            0,
            HISTORY_LIMIT,
          );
        });
      },
      async clearHistory() {
        updateData((d) => {
          d.history = [];
        });
      },
    },
    // Pas de journal ni de tableau de bord en mode démo : tout reste dans ce navigateur
    monitoring: { async report() {} },
  };
}
