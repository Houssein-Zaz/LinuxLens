import { feedbackSections } from '../../lib/backend/validation';
import { useLang } from '../../i18n';

/** Contenu d'un avis : chaque partie remplie sous son titre. */
export function FeedbackSections({ f }: { f: { liked: string; disliked: string; message: string } }) {
  useLang();
  const sections = feedbackSections(f);
  // Ancien message, sans formulaire : pas besoin de titre
  if (sections.length === 1 && sections[0]!.key === 'message') {
    return <p className="mt-1.5 text-sm whitespace-pre-line [overflow-wrap:anywhere]">{f.message}</p>;
  }
  return (
    <dl className="mt-1.5 space-y-1.5 text-sm">
      {sections.map((s) => (
        <div key={s.label}>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{s.label}</dt>
          <dd className="whitespace-pre-line [overflow-wrap:anywhere]">{s.text}</dd>
        </div>
      ))}
    </dl>
  );
}
