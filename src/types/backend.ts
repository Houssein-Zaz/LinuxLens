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
  /** `captchaToken` : jeton anti-robot, exigé par Supabase quand la protection CAPTCHA est activée. */
  signUp(email: string, password: string, displayName?: string, captchaToken?: string): Promise<SignUpResult>;
  signIn(email: string, password: string, captchaToken?: string): Promise<ActionResult>;
  signOut(): Promise<void>;
  /** Envoie un lien de réinitialisation du mot de passe. */
  requestPasswordReset(email: string, captchaToken?: string): Promise<ActionResult>;
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
  /** Messages envoyés avec ce compte et leurs réponses, les plus récents d'abord. */
  getMyFeedback(): Promise<MyFeedback[]>;
}

/** Erreur envoyée au journal, consultable dans le tableau de bord admin. */
export interface ErrorReport {
  /** Origine : `page` (plantage d'une page), `window`, `promise`, `auth`… */
  source: string;
  message: string;
  detail?: string;
}

/** Avis laissé par un visiteur : au moins un des trois champs est rempli. */
export interface FeedbackInput {
  /** Ce qui lui a plu. */
  liked?: string;
  /** Ce qui ne lui a pas plu. */
  disliked?: string;
  /** Commentaire libre (problème rencontré, explication manquante…). */
  message?: string;
  /** Commande affichée au moment de l'envoi, s'il y en a une. */
  command?: string;
}

/** Message envoyé par l'utilisateur connecté, avec la réponse de l'administrateur. */
export interface MyFeedback {
  id: number;
  liked: string;
  disliked: string;
  message: string;
  command: string;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
}

export interface MonitoringApi {
  /** Ne lève jamais d'erreur : un signalement raté est simplement perdu. */
  report(error: ErrorReport): Promise<void>;
  /** Contrairement à `report`, l'échec est renvoyé : le visiteur doit savoir si son message est parti. */
  sendFeedback(feedback: FeedbackInput): Promise<ActionResult>;
}

export interface AdminOverview {
  users: number;
  usersLast7Days: number;
  confirmed: number;
  activeLast7Days: number;
  attempts: number;
  attemptsLast7Days: number;
  correctLast7Days: number;
  errorsLast7Days: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
  attempts: number;
  solved: number;
}

/** Une réponse à un exercice, vue par l'administrateur (sans le texte de la réponse). */
export interface AdminAttempt {
  userId: string;
  exerciseId: string;
  kind: ExerciseKind;
  correct: boolean;
  usedHelp: boolean;
  createdAt: string;
}

export interface ErrorLog {
  id: number;
  email: string | null;
  source: string;
  message: string;
  detail: string;
  path: string;
  userAgent: string;
  createdAt: string;
}

export interface FeedbackEntry {
  id: number;
  email: string | null;
  /** Faux pour un visiteur sans compte : il n'a aucun moyen de lire une réponse. */
  canReply: boolean;
  liked: string;
  disliked: string;
  message: string;
  command: string;
  path: string;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
}

/** Réservé aux administrateurs : chaque appel est vérifié par la base. */
export interface AdminApi {
  isAdmin(): Promise<boolean>;
  overview(): Promise<AdminOverview>;
  users(): Promise<AdminUser[]>;
  /** Réponses les plus récentes de tous les utilisateurs. */
  attempts(limit?: number): Promise<AdminAttempt[]>;
  errors(): Promise<ErrorLog[]>;
  clearErrors(): Promise<void>;
  /** Messages des visiteurs, les plus récents d'abord. */
  feedback(): Promise<FeedbackEntry[]>;
  clearFeedback(): Promise<void>;
  /** Répond à un message (visible dans « Mon compte » de son auteur) ; une réponse vide la retire. */
  replyFeedback(id: number, reply: string): Promise<void>;
}

export interface Backend {
  /** `demo` : comptes stockés dans ce navigateur ; `supabase` : vraie base de données. */
  mode: 'demo' | 'supabase';
  auth: AuthApi;
  data: DataApi;
  monitoring: MonitoringApi;
  /** Absent en mode démo : le tableau de bord a besoin de la vraie base. */
  admin?: AdminApi;
}
