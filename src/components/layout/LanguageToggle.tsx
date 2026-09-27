import { LANGS, useLang, useSetLang, useTr } from '../../i18n';

const NAME = { fr: 'Français', en: 'English' } as const;

/** Choix de la langue : FR | EN. */
export function LanguageToggle() {
  const lang = useLang();
  const setLang = useSetLang();
  const tr = useTr();
  return (
    <div role="group" aria-label={tr('Langue', 'Language')} className="flex shrink-0 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-900">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          aria-label={NAME[l]}
          title={NAME[l]}
          onClick={() => setLang(l)}
          className={`rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors ${
            lang === l
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
