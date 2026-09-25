import { useEffect, useId, useState } from 'react';

interface Props {
  label: string;
  /** Valeur dérivée de l'état courant. */
  value: string;
  /** Renvoie `false` si la saisie est invalide ; l'état n'est alors pas modifié. */
  onCommit(text: string): boolean;
  hint: string;
  placeholder?: string;
  className?: string;
}

/**
 * Champ texte synchronisé : pendant la saisie, le brouillon est conservé même invalide ;
 * dès qu'il devient valide, il met à jour l'état global. Si l'état change ailleurs, le champ suit.
 */
export function SyncedField({ label, value, onCommit, hint, placeholder, className = '' }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(value);
    setInvalid(false);
  }, [value]);

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        value={draft}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={invalid}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          setInvalid(!onCommit(text.trim()));
        }}
        onBlur={() => {
          setDraft(value);
          setInvalid(false);
        }}
        className={`h-11 w-full rounded-xl border bg-white px-3 font-mono text-lg shadow-sm outline-none transition-shadow focus:ring-4 dark:bg-zinc-900 ${
          invalid
            ? 'border-red-300 focus:ring-red-500/10 dark:border-red-500/60'
            : 'border-zinc-200 focus:border-indigo-400 focus:ring-indigo-500/10 dark:border-zinc-800 dark:focus:border-indigo-500'
        }`}
      />
      <p id={`${id}-hint`} className={`mt-1 text-xs ${invalid ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
        {hint}
      </p>
    </div>
  );
}
