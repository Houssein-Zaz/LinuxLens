export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

/** Résultat d'une action : `error` contient un message en français, prêt à afficher. */
export interface ActionResult {
  error?: string;
}

export interface SignUpResult extends ActionResult {
  /** Vrai si un e-mail de confirmation doit être validé avant la connexion. */
  needsConfirmation?: boolean;
}

export interface HistoryEntry {
  command: string;
  createdAt: string; // ISO 8601
}

export interface AuthApi {
  getUser(): Promise<User | null>;
  /** Appelé à chaque connexion ou déconnexion. Renvoie la fonction de désabonnement. */
  onChange(listener: (user: User | null) => void): () => void;
  signUp(email: string, password: string, displayName?: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<ActionResult>;
  signOut(): Promise<void>;
  /** Envoie un lien de réinitialisation du mot de passe. */
  requestPasswordReset(email: string): Promise<ActionResult>;
  /** Change le mot de passe de l'utilisateur connecté (après le lien de réinitialisation). */
  updatePassword(password: string): Promise<ActionResult>;
  updateProfile(displayName: string): Promise<ActionResult>;
  deleteAccount(): Promise<ActionResult>;
}

export type ExerciseKind = 'write' | 'quiz' | 'perm';

/** Un essai sur un exercice, bonne ou mauvaise réponse. */
export interface AttemptInput {
  exerciseId: string;
  kind: ExerciseKind;
  correct: boolean;
  /** Réponse donnée (tronquée à ANSWER_MAX_LENGTH). */
  answer: string;
  /** Indice ou solution affichés avant cette réponse. */
  usedHelp: boolean;
}

export interface Attempt extends AttemptInput {
  createdAt: string; // ISO 8601
}

/** Données de l'utilisateur connecté. */
export interface DataApi {
  getProgress(): Promise<string[]>;
  addProgress(exerciseIds: string[]): Promise<void>;
  /** Efface les exercices réussis et tous les essais. */
  clearProgress(): Promise<void>;
  addAttempt(attempt: AttemptInput): Promise<void>;
  /** Essais les plus récents d'abord, au plus ATTEMPTS_LIMIT. */
  getAttempts(): Promise<Attempt[]>;
  getFavorites(): Promise<string[]>;
  setFavorite(command: string, favorite: boolean): Promise<void>;
  getHistory(limit?: number): Promise<HistoryEntry[]>;
  addHistory(command: string): Promise<void>;
  clearHistory(): Promise<void>;
}

export interface Backend {
  /** `demo` : comptes stockés dans ce navigateur ; `supabase` : vraie base de données. */
  mode: 'demo' | 'supabase';
  auth: AuthApi;
  data: DataApi;
}
