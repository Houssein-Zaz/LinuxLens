import type { AuthError, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import type {
  AdminAttempt,
  AdminUser,
  Attempt,
  Backend,
  ErrorLog,
  ErrorReport,
  FeedbackEntry,
  FeedbackInput,
  HistoryEntry,
  User,
} from '../../types/backend';
import {
  ANSWER_MAX_LENGTH,
  ATTEMPTS_LIMIT,
  FEEDBACK_COMMAND_MAX_LENGTH,
  FEEDBACK_MAX_LENGTH,
  HISTORY_LIMIT,
  normalizeEmail,
  validateEmail,
  validatePassword,
} from './validation';

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
  captcha_failed: 'La vérification anti-robot a échoué. Réessayez.',
};

/** Message d'erreur Supabase → français. */
export function translateAuthError(error: Pick<AuthError, 'message'> & { code?: string | undefined; status?: number | undefined }): string {
  if (error.code && ERRORS[error.code]) return ERRORS[error.code]!;
  const m = error.message.toLowerCase();
  if (m.includes('invalid login credentials')) return ERRORS.invalid_credentials!;
  if (m.includes('already registered')) return ERRORS.user_already_exists!;
  if (m.includes('email not confirmed')) return ERRORS.email_not_confirmed!;
  if (error.status === 429 || m.includes('rate limit')) return ERRORS.over_request_rate_limit!;
  if (m.includes('captcha')) return ERRORS.captcha_failed!;
  if (m.includes('failed to fetch') || m.includes('network')) return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  return UNKNOWN_ERROR;
}

const UNKNOWN_ERROR = 'Une erreur est survenue. Réessayez dans un instant.';

const toUser = (u: SupabaseUser | null | undefined): User | null =>
  u ? { id: u.id, email: u.email ?? '', displayName: (u.user_metadata?.display_name as string | undefined) ?? null } : null;

interface AttemptRow {
  exercise_id: string;
  kind: Attempt['kind'];
  correct: boolean;
  answer: string;
  used_help: boolean;
  created_at: string;
}

interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  attempts: number | string; // bigint : peut arriver en texte
  solved: number | string;
}

interface AdminAttemptRow {
  user_id: string;
  exercise_id: string;
  kind: AdminAttempt['kind'];
  correct: boolean;
  used_help: boolean;
  created_at: string;
}

interface ErrorLogRow {
  id: number;
  email: string | null;
  source: string;
  message: string;
  detail: string;
  path: string;
  user_agent: string;
  created_at: string;
}

interface FeedbackRow {
  id: number;
  email: string | null;
  message: string;
  command: string;
  path: string;
  created_at: string;
}

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

  const report = async ({ source, message, detail = '' }: ErrorReport) => {
    try {
      // user_id est rempli par la base (auth.uid()), vide pour un visiteur sans compte
      await client.from('error_logs').insert({
        source: source.slice(0, 50),
        message: message.slice(0, 500),
        detail: detail.slice(0, 2000),
        path: typeof window === 'undefined' ? '' : window.location.pathname.slice(0, 300),
        user_agent: typeof navigator === 'undefined' ? '' : navigator.userAgent.slice(0, 300),
      });
    } catch {
      // le journal ne doit jamais provoquer d'erreur à son tour
    }
  };

  const sendFeedback = async ({ message, command = '' }: FeedbackInput) => {
    const text = message.trim();
    if (!text) return { error: 'Écrivez votre message.' };
    try {
      // user_id est rempli par la base, comme pour le journal des erreurs
      const { error } = await client.from('feedback').insert({
        message: text.slice(0, FEEDBACK_MAX_LENGTH),
        command: command.trim().slice(0, FEEDBACK_COMMAND_MAX_LENGTH),
        path: typeof window === 'undefined' ? '' : window.location.pathname.slice(0, 300),
      });
      return error ? { error: UNKNOWN_ERROR } : {};
    } catch {
      return { error: 'Impossible de joindre le serveur. Vérifiez votre connexion.' };
    }
  };

  /** Traduit l'erreur ; une erreur que l'on ne sait pas expliquer est signalée à l'administrateur. */
  const fail = (action: string, error: Parameters<typeof translateAuthError>[0]) => {
    const message = translateAuthError(error);
    if (message === UNKNOWN_ERROR) {
      void report({ source: 'auth', message: `${action} : ${error.message}`, detail: JSON.stringify({ code: error.code, status: error.status }) });
    }
    return { error: message };
  };

  const rpc = async <T>(name: string, args?: Record<string, unknown>): Promise<T> => {
    const { data, error } = await client.rpc(name, args);
    check({ error });
    return data as T;
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
      async signUp(email, password, displayName, captchaToken) {
        const invalid = validateEmail(email) ?? validatePassword(password);
        if (invalid) return { error: invalid };
        const { data, error } = await client.auth.signUp({
          email: normalizeEmail(email),
          password,
          options: {
            emailRedirectTo: siteUrl('/connexion'),
            data: { display_name: displayName?.trim() || null },
            ...(captchaToken && { captchaToken }),
          },
        });
        if (error) return fail('Inscription', error);
        // Adresse déjà utilisée : Supabase renvoie un utilisateur sans identité (pour ne pas révéler l'existence du compte)
        if (data.user && data.user.identities?.length === 0) return { error: ERRORS.user_already_exists! };
        return { needsConfirmation: !data.session };
      },
      async signIn(email, password, captchaToken) {
        const { error } = await client.auth.signInWithPassword({
          email: normalizeEmail(email),
          password,
          ...(captchaToken && { options: { captchaToken } }),
        });
        return error ? fail('Connexion', error) : {};
      },
      async signOut() {
        await client.auth.signOut();
      },
      async requestPasswordReset(email, captchaToken) {
        const invalid = validateEmail(email);
        if (invalid) return { error: invalid };
        const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(email), {
          redirectTo: siteUrl('/nouveau-mot-de-passe'),
          ...(captchaToken && { captchaToken }),
        });
        return error ? fail('Mot de passe oublié', error) : {};
      },
      async updatePassword(password) {
        const invalid = validatePassword(password);
        if (invalid) return { error: invalid };
        const { error } = await client.auth.updateUser({ password });
        return error ? fail('Nouveau mot de passe', error) : {};
      },
      async updateProfile(displayName) {
        const { error } = await client.auth.updateUser({ data: { display_name: displayName.trim() || null } });
        return error ? fail('Profil', error) : {};
      },
      async deleteAccount() {
        // Fonction SQL delete_user() (security definer) : supprime auth.users, les données suivent (on delete cascade)
        const { error } = await client.rpc('delete_user');
        if (error) {
          void report({ source: 'auth', message: `Suppression du compte : ${error.message}` });
          return { error: 'La suppression du compte a échoué. Réessayez plus tard.' };
        }
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
        const user_id = await userId();
        check(await client.from('exercise_progress').delete().eq('user_id', user_id));
        check(await client.from('exercise_attempts').delete().eq('user_id', user_id));
      },
      async addAttempt(a) {
        const user_id = await userId();
        check(
          await client.from('exercise_attempts').insert({
            user_id,
            exercise_id: a.exerciseId,
            kind: a.kind,
            correct: a.correct,
            answer: a.answer.slice(0, ANSWER_MAX_LENGTH),
            used_help: a.usedHelp,
          }),
        );
      },
      async getAttempts() {
        const { data, error } = await client
          .from('exercise_attempts')
          .select('exercise_id, kind, correct, answer, used_help, created_at')
          .order('created_at', { ascending: false })
          .limit(ATTEMPTS_LIMIT);
        check({ error });
        return (data ?? []).map(
          (r: AttemptRow): Attempt => ({
            exerciseId: r.exercise_id,
            kind: r.kind,
            correct: r.correct,
            answer: r.answer,
            usedHelp: r.used_help,
            createdAt: r.created_at,
          }),
        );
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
    monitoring: { report, sendFeedback },
    admin: {
      async isAdmin() {
        const { data, error } = await client.rpc('is_admin');
        return !error && data === true;
      },
      async overview() {
        const o = await rpc<Record<string, number>>('admin_overview');
        return {
          users: o.users ?? 0,
          usersLast7Days: o.users_7d ?? 0,
          confirmed: o.confirmed ?? 0,
          activeLast7Days: o.active_7d ?? 0,
          attempts: o.attempts ?? 0,
          attemptsLast7Days: o.attempts_7d ?? 0,
          correctLast7Days: o.correct_7d ?? 0,
          errorsLast7Days: o.errors_7d ?? 0,
        };
      },
      async users() {
        const rows = await rpc<AdminUserRow[] | null>('admin_users');
        return (rows ?? []).map(
          (r): AdminUser => ({
            id: r.id,
            email: r.email,
            displayName: r.display_name,
            createdAt: r.created_at,
            lastSignInAt: r.last_sign_in_at,
            confirmed: r.confirmed,
            attempts: Number(r.attempts),
            solved: Number(r.solved),
          }),
        );
      },
      async attempts(limit = 5000) {
        const rows = await rpc<AdminAttemptRow[] | null>('admin_attempts', { max_rows: limit });
        return (rows ?? []).map(
          (r): AdminAttempt => ({
            userId: r.user_id,
            exerciseId: r.exercise_id,
            kind: r.kind,
            correct: r.correct,
            usedHelp: r.used_help,
            createdAt: r.created_at,
          }),
        );
      },
      async errors() {
        const rows = await rpc<ErrorLogRow[] | null>('admin_errors');
        return (rows ?? []).map(
          (r): ErrorLog => ({
            id: r.id,
            email: r.email,
            source: r.source,
            message: r.message,
            detail: r.detail,
            path: r.path,
            userAgent: r.user_agent,
            createdAt: r.created_at,
          }),
        );
      },
      async clearErrors() {
        await rpc('admin_clear_errors');
      },
      async feedback() {
        const rows = await rpc<FeedbackRow[] | null>('admin_feedback');
        return (rows ?? []).map(
          (r): FeedbackEntry => ({ id: r.id, email: r.email, message: r.message, command: r.command, path: r.path, createdAt: r.created_at }),
        );
      },
      async clearFeedback() {
        await rpc('admin_clear_feedback');
      },
    },
  };
}
