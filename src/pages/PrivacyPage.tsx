import { TURNSTILE_SITE_KEY } from '../components/auth/Captcha';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';

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
          <li>les exercices réussis et vos réponses aux exercices (juste ou fausse, avec ou sans aide), pour vos statistiques ;</li>
          <li>vos commandes favorites et l’historique des commandes expliquées.</li>
        </ul>
        {TURNSTILE_SITE_KEY && (
          <p>
            Pour bloquer les robots, l’inscription et la connexion passent par une vérification{' '}
            <a className="underline underline-offset-2" href="https://www.cloudflare.com/fr-fr/privacypolicy/">
              Cloudflare Turnstile
            </a>
            , qui analyse des signaux techniques du navigateur, sans cookie publicitaire.
          </p>
        )}
        <p>
          Ces données servent à vous les restituer d’un appareil à l’autre. Elles ne sont ni vendues, ni partagées, ni
          utilisées à des fins publicitaires. Elles sont hébergées par Supabase.
        </p>
        <p>
          L’éditeur du site peut consulter la liste des comptes (adresse, date d’inscription et de dernière connexion) et
          les réponses aux exercices, pour suivre le fonctionnement du site. L’historique des commandes expliquées n’est
          visible que par vous.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Évitez de taper des informations sensibles (mots de passe, clés d’API) dans le champ d’explication : les commandes
          expliquées sont ajoutées à votre historique.
        </p>
      </Section>

      <Section title="Erreurs techniques">
        <p>
          Quand une page plante ou qu’une erreur inattendue survient, un rapport est enregistré pour pouvoir la corriger :
          le message d’erreur, la page concernée, le type de navigateur et, si vous êtes connecté, votre compte. Ces rapports
          sont effacés régulièrement.
        </p>
      </Section>

      <Section title="Messages envoyés">
        <p>
          Les messages envoyés avec « Dites-le-nous » sont lus par l’administrateur du site, avec la commande affichée à ce
          moment-là et, si vous êtes connecté, votre adresse e-mail pour pouvoir vous répondre. La réponse s’affiche dans
          « Mon compte ». Si vous supprimez votre compte, vos messages sont conservés sans lien avec vous.
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
