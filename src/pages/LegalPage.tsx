import { Link } from 'react-router';
import { PageHeader } from '../components/ui/PageHeader';
import { Section } from '../components/ui/Section';
import { useLang } from '../i18n';

/*
 * Informations de l'éditeur : à tenir à jour.
 * Un particulier qui édite un site à titre non professionnel peut se contenter d'un pseudonyme,
 * à condition d'avoir communiqué son identité à l'hébergeur (loi pour la confiance dans l'économie numérique, art. 6).
 */
const EDITOR = {
  name: 'Houssein-Zaz',
  contactLabel: 'profil GitHub',
  contactUrl: 'https://github.com/Houssein-Zaz',
  repoUrl: 'https://github.com/Houssein-Zaz/LinuxLens',
};

const link = 'text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400';

export function LegalPage() {
  if (useLang() === 'en') return <LegalEn />;
  return (
    <article className="max-w-2xl">
      <PageHeader title="Mentions légales">Qui édite et héberge LinuxLens.</PageHeader>

      <Section title="Éditeur">
        <p>
          LinuxLens est un site personnel et non commercial, édité par <strong className="font-medium">{EDITOR.name}</strong>, à
          titre de particulier.
        </p>
        <p>
          Contact :{' '}
          <a className={link} href={EDITOR.contactUrl}>
            {EDITOR.contactLabel}
          </a>
          . Le code source est public sur{' '}
          <a className={link} href={EDITOR.repoUrl}>
            GitHub
          </a>
          .
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          Site hébergé par <strong className="font-medium">Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723,
          États-Unis —{' '}
          <a className={link} href="https://vercel.com">
            vercel.com
          </a>
          .
        </p>
        <p>
          Comptes et données des utilisateurs hébergés par <strong className="font-medium">Supabase Inc.</strong> —{' '}
          <a className={link} href="https://supabase.com">
            supabase.com
          </a>
          . Le détail des données enregistrées figure dans la page{' '}
          <Link className={link} to="/confidentialite">
            Confidentialité
          </Link>
          .
        </p>
      </Section>

      <Section title="Contenus et licences">
        <p>
          Les fiches détaillées, les explications et les exercices sont rédigés pour LinuxLens. Les fiches étendues proviennent
          de{' '}
          <a className={link} href="https://github.com/tldr-pages/tldr">
            tldr-pages
          </a>{' '}
          (© les contributeurs tldr-pages), sous licence{' '}
          <a className={link} href="https://github.com/tldr-pages/tldr/blob/main/LICENSE.md">
            CC BY 4.0
          </a>
          . Polices Inter et JetBrains Mono sous licence SIL Open Font License.
        </p>
      </Section>

      <Section title="Responsabilité">
        <p>
          Les explications sont fournies à titre pédagogique. Certaines commandes (suppression, droits administrateur…) peuvent
          modifier ou détruire des données : vérifiez toujours une commande avant de l’exécuter sur un vrai système.
        </p>
      </Section>
    </article>
  );
}

function LegalEn() {
  return (
    <article className="max-w-2xl">
      <PageHeader title="Legal notice">Who publishes and hosts LinuxLens.</PageHeader>

      <Section title="Publisher">
        <p>
          LinuxLens is a personal, non-commercial site, published by <strong className="font-medium">{EDITOR.name}</strong> as a
          private individual.
        </p>
        <p>
          Contact:{' '}
          <a className={link} href={EDITOR.contactUrl}>
            GitHub profile
          </a>
          . The source code is public on{' '}
          <a className={link} href={EDITOR.repoUrl}>
            GitHub
          </a>
          .
        </p>
      </Section>

      <Section title="Hosting">
        <p>
          Site hosted by <strong className="font-medium">Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723, United
          States —{' '}
          <a className={link} href="https://vercel.com">
            vercel.com
          </a>
          .
        </p>
        <p>
          User accounts and data hosted by <strong className="font-medium">Supabase Inc.</strong> —{' '}
          <a className={link} href="https://supabase.com">
            supabase.com
          </a>
          . The details of the data stored are on the{' '}
          <Link className={link} to="/confidentialite">
            Privacy
          </Link>{' '}
          page.
        </p>
      </Section>

      <Section title="Content and licenses">
        <p>
          The detailed pages, explanations and exercises are written for LinuxLens. The extended pages come from{' '}
          <a className={link} href="https://github.com/tldr-pages/tldr">
            tldr-pages
          </a>{' '}
          (© the tldr-pages contributors), under the{' '}
          <a className={link} href="https://github.com/tldr-pages/tldr/blob/main/LICENSE.md">
            CC BY 4.0
          </a>{' '}
          license. Inter and JetBrains Mono fonts under the SIL Open Font License.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          The explanations are provided for learning purposes. Some commands (deletion, administrator rights…) can change or
          destroy data: always check a command before running it on a real system.
        </p>
      </Section>
    </article>
  );
}
