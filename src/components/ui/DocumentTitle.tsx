export const SITE_NAME = 'LinuxLens';

/** Titre de l'onglet. React 19 place la balise `<title>` dans `<head>`, où qu'elle soit rendue. */
export function DocumentTitle({ title }: { title?: string }) {
  return <title>{title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — les commandes Linux expliquées`}</title>;
}
