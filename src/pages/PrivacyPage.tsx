import type { ReactNode } from 'react';
import { PageHeader } from '../components/ui/PageHeader';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2 text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <article className="max-w-2xl">
      <PageHeader title="Confidentialité">Ce que LinuxLens enregistre, et pourquoi.</PageHeader>

      <Section title="Sans compte">
        <p>
          Rien n’est envoyé à un serveur. Vos préférences (thème) et votre progression aux exercices sont enregistrées dans
          le stockage local de votre navigateur ; vous pouvez les effacer à tout moment en vidant les données du site.
        </p>
      </Section>

      <Section title="Avec un compte">
        <p>Nous enregistrons uniquement :</p>
        <ul className="list-inside list-disc space-y-1">
          <li>votre adresse e-mail et, si vous le souhaitez, un nom affiché ;</li>
          <li>votre mot de passe, sous forme chiffrée (haché), jamais en clair ;</li>
          <li>les exercices réussis, vos commandes favorites et l’historique des commandes expliquées.</li>
        </ul>
        <p>
          Ces données servent seulement à vous les restituer d’un appareil à l’autre. Elles ne sont ni vendues, ni
          partagées, ni utilisées à des fins publicitaires. Elles sont hébergées par Supabase.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Évitez de taper des informations sensibles (mots de passe, clés d’API) dans le champ d’explication : les commandes
          expliquées sont ajoutées à votre historique.
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Depuis la page « Mon compte », vous pouvez consulter vos données, effacer votre historique et supprimer votre
          compte : toutes les données associées sont alors supprimées définitivement.
        </p>
      </Section>
    </article>
  );
}
