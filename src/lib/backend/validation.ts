/** Règles communes aux deux backends et aux formulaires. */

import type { FeedbackInput } from '../../types/backend';
import { tr } from '../../i18n';

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
  if (!email.trim()) return tr('Indiquez votre adresse e-mail.', 'Enter your email address.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return tr('Cette adresse e-mail n’est pas valide.', 'This email address is not valid.');
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return tr(`Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`, `The password must be at least ${PASSWORD_MIN_LENGTH} characters long.`);
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return tr('Le mot de passe doit contenir au moins une lettre et un chiffre.', 'The password must contain at least one letter and one digit.');
  }
  return undefined;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Avis nettoyé, prêt à enregistrer ; `error` si les trois champs sont vides. */
export function cleanFeedback({ liked = '', disliked = '', message = '', command = '' }: FeedbackInput) {
  const fields = {
    liked: liked.trim().slice(0, FEEDBACK_MAX_LENGTH),
    disliked: disliked.trim().slice(0, FEEDBACK_MAX_LENGTH),
    message: message.trim().slice(0, FEEDBACK_MAX_LENGTH),
    command: command.trim().slice(0, FEEDBACK_COMMAND_MAX_LENGTH),
  };
  const error = fields.liked || fields.disliked || fields.message ? undefined : tr('Remplissez au moins un champ.', 'Fill in at least one field.');
  return { fields, error };
}

/** Parties remplies d'un avis, dans l'ordre du formulaire (pour l'affichage et le PDF). */
export function feedbackSections(f: { liked: string; disliked: string; message: string }) {
  return [
    { key: 'liked', label: tr('Ce qui a plu', 'What they liked'), text: f.liked },
    { key: 'disliked', label: tr('Ce qui n’a pas plu', 'What they did not like'), text: f.disliked },
    { key: 'message', label: tr('Commentaire', 'Comment'), text: f.message },
  ].filter((s) => s.text);
}
