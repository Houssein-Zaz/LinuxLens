import type { AuthError, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import type { Backend, HistoryEntry, User } from '../../types/backend';
import { HISTORY_LIMIT, normalizeEmail, validateEmail, validatePassword } from './validation';

/*
 * Backend Supabase : authentification Supabase Auth, données dans PostgreSQL.
 * La sécurité repose sur les règles RLS de supabase/schema.sql : chaque utilisateur
 * ne peut lire et modifier que ses propres lignes.
 */

const ERRORS: Record<string, string> = {
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  user_already_exists: 'Un compte existe déjà avec cette adresse e-mail.',
  email_exists: 'Un compte existe déjà avec cette adresse e-mail.',
  email_not_confirmed: 'Confirmez d’abord votre adresse : un lien vous a été envoyé par e-mail.',
  weak_password: 'Ce mot de passe est trop faible.',
  same_password: 'Le nouveau mot de passe doit être différent de l’ancien.',
  over_email_send_rate_limit: 'Trop d’e-mails envoyés. Réessayez dans quelques minutes.',
  over_request_rate_limit: 'Trop de tentatives. Réessayez dans quelques minutes.',
};

/** Message d'erreur Supabase → français. */
export function translateAuthError(error: Pick<AuthError, 'message'> & { code?: string | undefined; status?: number | undefined }): string {
  if (error.code && ERRORS[error.code]) return ERRORS[error.code]!;
  const m = error.message.toLowerCase();
  if (m.includes('invalid login credentials')) return ERRORS.invalid_credentials!;
  if (m.includes('already registered')) return ERRORS.user_already_exists!;
  if (m.includes('email not confirmed')) return ERRORS.email_not_confirmed!;
  if (error.status === 429 || m.includes('rate limit')) return ERRORS.over_request_rate_limit!;
  if (m.includes('failed to fetch') || m.includes('network')) return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

const toUser = (u: SupabaseUser | null | undefined): User | null =>
  u ? { id: u.id, email: u.email ?? '', displayName: (u.user_metadata?.display_name as string | undefined) ?? null } : null;

/** Adresse de retour des liens envoyés par e-mail. */
const siteUrl = (path: string) => (typeof window === 'undefined' ? path : `${window.location.origin}${path}`);

export function createSupabaseBackend(client: SupabaseClient): Backend {
  const userId = async () => {
    const { data } = await client.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('Non connecté');
    return id;
  };
  const check = ({ error }: { error: { message: string } | null }) => {
    if (error) throw new Error(error.message);
  };

  return {
    mode: 'supabase',
    auth: {
      async getUser() {
        const { data } = await client.auth.getSession();
        return toUser(data.session?.user);
      },
      onChange(listener) {
        const { data } = client.auth.onAuthStateChange((_event, session) => listener(toUser(session?.user)));
        return () => data.subscription.unsubscribe();
      },
      async signUp(email, password, displayName) {
        const invalid = validateEmail(email) ?? validatePassword(password);
        if (invalid) return { error: invalid };
        const { data, error } = await client.auth.signUp({
          email: normalizeEmail(email),
          password,
          options: {
            emailRedirectTo: siteUrl('/connexion'),
            data: { display_name: displayName?.trim() || null },
          },
        });
        if (error) return { error: translateAuthError(error) };
        // Adresse déjà utilisée : Supabase renvoie un utilisateur sans identité (pour ne pas révéler l'existence du compte)
        if (data.user && data.user.identities?.length === 0) return { error: ERRORS.user_already_exists! };
        return { needsConfirmation: !data.session };
      },
      async signIn(email, password) {
        const { error } = await client.auth.signInWithPassword({ email: normalizeEmail(email), password });
        return error ? { error: translateAuthError(error) } : {};
      },
      async signOut() {
        await client.auth.signOut();
      },
      async requestPasswordReset(email) {
        const invalid = validateEmail(email);
        if (invalid) return { error: invalid };
        const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(email), {
          redirectTo: siteUrl('/nouveau-mot-de-passe'),
        });
        return error ? { error: translateAuthError(error) } : {};
      },
      async updatePassword(password) {
        const invalid = validatePassword(password);
        if (invalid) return { error: invalid };
        const { error } = await client.auth.updateUser({ password });
        return error ? { error: translateAuthError(error) } : {};
      },
      async updateProfile(displayName) {
        const { error } = await client.auth.updateUser({ data: { display_name: displayName.trim() || null } });
        return error ? { error: translateAuthError(error) } : {};
      },
      async deleteAccount() {
        // Fonction SQL delete_user() (security definer) : supprime auth.users, les données suivent (on delete cascade)
        const { error } = await client.rpc('delete_user');
        if (error) return { error: 'La suppression du compte a échoué. Réessayez plus tard.' };
        await client.auth.signOut();
        return {};
      },
    },
    data: {
      async getProgress() {
        const { data, error } = await client.from('exercise_progress').select('exercise_id');
        check({ error });
        return (data ?? []).map((r: { exercise_id: string }) => r.exercise_id);
      },
      async addProgress(ids) {
        if (ids.length === 0) return;
        const user_id = await userId();
        check(
          await client
            .from('exercise_progress')
            .upsert(ids.map((exercise_id) => ({ user_id, exercise_id })), { onConflict: 'user_id,exercise_id', ignoreDuplicates: true }),
        );
      },
      async clearProgress() {
        check(await client.from('exercise_progress').delete().eq('user_id', await userId()));
      },
      async getFavorites() {
        const { data, error } = await client.from('favorites').select('command').order('created_at', { ascending: false });
        check({ error });
        return (data ?? []).map((r: { command: string }) => r.command);
      },
      async setFavorite(command, favorite) {
        const user_id = await userId();
        check(
          favorite
            ? await client.from('favorites').upsert({ user_id, command }, { onConflict: 'user_id,command', ignoreDuplicates: true })
            : await client.from('favorites').delete().eq('user_id', user_id).eq('command', command),
        );
      },
      async getHistory(limit = HISTORY_LIMIT) {
        const { data, error } = await client
          .from('history')
          .select('command, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        check({ error });
        return (data ?? []).map((r: { command: string; created_at: string }): HistoryEntry => ({ command: r.command, createdAt: r.created_at }));
      },
      async addHistory(command) {
        const user_id = await userId();
        // Une ligne par commande : la réutiliser remet sa date à jour
        check(
          await client
            .from('history')
            .upsert({ user_id, command, created_at: new Date().toISOString() }, { onConflict: 'user_id,command' }),
        );
      },
      async clearHistory() {
        check(await client.from('history').delete().eq('user_id', await userId()));
      },
    },
  };
}
