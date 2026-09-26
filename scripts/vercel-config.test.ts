import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

describe('vercel.json', () => {
  const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const csp = config.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')!.value;

  it('autorise le script de thème de index.html par son empreinte', () => {
    // Si ce test échoue après une modification du script : recopier l'empreinte attendue dans vercel.json
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
    expect(inline).toHaveLength(1);
    const hash = createHash('sha256').update(inline[0]!).digest('base64');
    expect(csp).toContain(`'sha256-${hash}'`);
  });

  it('autorise Supabase', () => {
    expect(csp).toMatch(/connect-src[^;]*https:\/\/\*\.supabase\.co/);
  });

  it('autorise la vérification anti-robot Cloudflare Turnstile (script et cadre)', () => {
    expect(csp).toMatch(/script-src[^;]*https:\/\/challenges\.cloudflare\.com/);
    expect(csp).toMatch(/frame-src[^;]*https:\/\/challenges\.cloudflare\.com/);
  });
});
