import { feedbackSections } from '../lib/backend/validation';
import type { FeedbackEntry } from '../types/backend';
import { fullDate } from './format';

/*
 * Export des avis en PDF, sans bibliothèque : une page imprimable s'ouvre et la
 * fenêtre d'impression du navigateur propose « Enregistrer au format PDF ».
 * Tous les caractères (accents, emoji, autres alphabets) passent, ce qui n'est
 * pas le cas des générateurs de PDF qui n'embarquent pas de police.
 */

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const STYLE = `
  @page { margin: 18mm 16mm; }
  body { font: 11pt/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #18181b; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 2pt; }
  .meta { color: #52525b; font-size: 9.5pt; margin: 0 0 14pt; }
  article { border: 1px solid #d4d4d8; border-radius: 8pt; padding: 10pt 12pt; margin-bottom: 10pt; break-inside: avoid; }
  header { display: flex; justify-content: space-between; gap: 12pt; font-size: 9.5pt; color: #52525b; margin-bottom: 6pt; }
  header strong { color: #18181b; }
  h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: .04em; color: #52525b; margin: 8pt 0 1pt; }
  p { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
  code { font: 9.5pt ui-monospace, Consolas, monospace; }
  .reply { border-left: 3pt solid #6366f1; background: #eef2ff; padding: 6pt 8pt; margin-top: 8pt; }
`;

function entryHtml(f: FeedbackEntry) {
  const sections = feedbackSections(f)
    .map((s) => `<h2>${escape(s.label)}</h2><p>${escape(s.text)}</p>`)
    .join('');
  const command = f.command ? `<h2>Commande</h2><p><code>${escape(f.command)}</code></p>` : '';
  const reply = f.reply ? `<div class="reply"><h2>Votre réponse</h2><p>${escape(f.reply)}</p></div>` : '';
  return `<article>
    <header><strong>${escape(f.email ?? 'Visiteur sans compte')}</strong><span>${escape(fullDate(f.createdAt))}</span></header>
    ${sections}${command}${reply}
  </article>`;
}

/** Page HTML complète, prête à imprimer. */
export function feedbackReportHtml(entries: FeedbackEntry[], now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  const count = `${entries.length} avis`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>LinuxLens - avis - ${day}</title>
<style>${STYLE}</style>
</head>
<body>
<h1>Avis des visiteurs</h1>
<p class="meta">LinuxLens · ${escape(count)} · exporté le ${escape(fullDate(now.toISOString()))}</p>
${entries.map(entryHtml).join('\n')}
</body>
</html>`;
}

/** Ouvre la page et la fenêtre d'impression. Faux si le navigateur a bloqué la fenêtre. */
export function printFeedback(entries: FeedbackEntry[]): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(feedbackReportHtml(entries));
  w.document.close();
  w.addEventListener('afterprint', () => w.close());
  w.focus();
  w.print();
  return true;
}
