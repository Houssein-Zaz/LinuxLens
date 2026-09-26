import { feedbackReportHtml } from '../feedbackPdf';
import type { FeedbackEntry } from '../../types/backend';

const entry: FeedbackEntry = {
  id: 1,
  email: null,
  canReply: false,
  liked: 'Les <b>exemples</b>',
  disliked: '',
  message: 'Rien à dire',
  command: 'ls -la',
  path: '/',
  createdAt: '2026-09-20T10:00:00Z',
  reply: 'Merci !',
  repliedAt: '2026-09-21T10:00:00Z',
};

describe('export PDF des avis', () => {
  it('parties remplies seulement, texte échappé, titre daté', () => {
    const html = feedbackReportHtml([entry], new Date('2026-09-26T12:00:00Z'));
    expect(html).toContain('<title>LinuxLens - avis - 2026-09-26</title>');
    expect(html).toContain('Ce qui a plu');
    expect(html).not.toContain('Ce qui n’a pas plu');
    expect(html).toContain('Les &lt;b&gt;exemples&lt;/b&gt;');
    expect(html).toContain('Visiteur sans compte');
    expect(html).toContain('<code>ls -la</code>');
    expect(html).toContain('Votre réponse');
  });
});
