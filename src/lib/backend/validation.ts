/** Règles communes aux deux backends et aux formulaires. */

export const PASSWORD_MIN_LENGTH = 8;
export const HISTORY_LIMIT = 50;
/** Essais conservés par utilisateur (les plus anciens sont effacés, aussi côté base). */
export const ATTEMPTS_LIMIT = 1000;
export const ANSWER_MAX_LENGTH = 200;
export const FEEDBACK_MAX_LENGTH = 1000;
export const FEEDBACK_COMMAND_MAX_LENGTH = 500;
export const FEEDBACK_REPLY_MAX_LENGTH = 2000;
/** Messages affichés dans « Mon compte ». */
export const MY_FEEDBACK_LIMIT = 50;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Indiquez votre adresse e-mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Cette adresse e-mail n’est pas valide.';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
  return undefined;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
