import { TURNSTILE_SITE_KEY } from '../components/auth/Captcha';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { useLang } from '../i18n';

export function PrivacyPage() {
  if (useLang() === 'en') return <PrivacyEn />;
  return (
    <article className="max-w-2xl">
      <PageHeader title="Confidentialité">Ce que LinuxLens enregistre, et pourquoi.</PageHeader>

      <Section title="Sans compte">
        <p>
          Rien n’est envoyé à un serveur. Vos préférences (thème) sont enregistrées dans le stockage local de votre
          navigateur, comme les exercices d’essai (ceux que vous avez faits et réussis) ; vous pouvez les effacer à tout
          moment en vidant les données du site. Au-delà des exercices d’essai, les exercices demandent un compte.
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

function PrivacyEn() {
  return (
    <article className="max-w-2xl">
      <PageHeader title="Privacy">What LinuxLens stores, and why.</PageHeader>

      <Section title="Without an account">
        <p>
          Nothing is sent to a server. Your preferences (theme, language) are stored in your browser’s local storage, along
          with your trial exercises (the ones you did and solved); you can erase them at any time by clearing the site’s
          data. Beyond the trial exercises, the exercises require an account.
        </p>
      </Section>

      <Section title="With an account">
        <p>We only store:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>your email address and, if you wish, a display name;</li>
          <li>your password, in encrypted (hashed) form, never in plain text;</li>
          <li>the exercises you solved and your answers (right or wrong, with or without help), for your statistics;</li>
          <li>your favorite commands and the history of explained commands.</li>
        </ul>
        {TURNSTILE_SITE_KEY && (
          <p>
            To block bots, sign-up and sign-in go through a{' '}
            <a className="underline underline-offset-2" href="https://www.cloudflare.com/privacypolicy/">
              Cloudflare Turnstile
            </a>{' '}
            check, which looks at technical browser signals, without advertising cookies.
          </p>
        )}
        <p>
          This data is used to give it back to you from one device to another. It is not sold, shared or used for
          advertising. It is hosted by Supabase.
        </p>
        <p>
          The site’s publisher can see the list of accounts (address, sign-up and last sign-in dates) and the answers to
          exercises, to keep track of how the site is working. The history of explained commands is visible only to you.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Avoid typing sensitive information (passwords, API keys) in the explanation field: explained commands are added to
          your history.
        </p>
      </Section>

      <Section title="Technical errors">
        <p>
          When a page crashes or an unexpected error occurs, a report is saved so it can be fixed: the error message, the
          page concerned, the browser type and, if you are signed in, your account. These reports are deleted regularly.
        </p>
      </Section>

      <Section title="Messages you send">
        <p>
          Messages sent with “Tell us” are read by the site’s administrator, along with the command shown at the time and,
          if you are signed in, your email address so they can reply. The reply appears in “My account”. If you delete your
          account, your messages are kept without any link to you.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          From the “My account” page, you can see your data, clear your history and delete your account: all associated data
          is then permanently deleted.
        </p>
      </Section>
    </article>
  );
}
