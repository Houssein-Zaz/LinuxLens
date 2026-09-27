import { useTr } from '../../i18n';

export const SITE_NAME = 'LinuxLens';

/** Titre de l'onglet. React 19 place la balise `<title>` dans `<head>`, où qu'elle soit rendue. */
export function DocumentTitle({ title }: { title?: string }) {
  const tr = useTr();
  return <title>{title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — ${tr('les commandes Linux expliquées', 'Linux commands explained')}`}</title>;
}
