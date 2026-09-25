/** Normalise pour la recherche : minuscules, sans accents. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Score de pertinence (0 = pas de correspondance). Le nom compte plus que le résumé ;
 * tous les mots de la requête doivent être trouvés.
 */
export function matchScore(query: string, name: string, summary = ''): number {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  const n = normalize(name);
  const s = normalize(summary);
  let score = 0;
  for (const w of words) {
    if (n === w) score += 100;
    else if (n.startsWith(w)) score += 50;
    else if (n.includes(w)) score += 20;
    else if (s.includes(w)) score += 5;
    else return 0;
  }
  return score;
}
