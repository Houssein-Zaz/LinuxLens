import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTr } from '../../i18n';
import { buttonClass } from '../practice/Feedback';

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  /** Texte du bouton de confirmation : « Supprimer », « Enregistrer »… */
  confirmLabel: string;
  /** Bouton rouge pour une suppression. */
  danger?: boolean;
}

/**
 * Demande une confirmation avant une modification ou une suppression.
 * `const [confirm, dialog] = useConfirm()` : afficher `dialog`, puis `if (await confirm({...}))`.
 */
export function useConfirm() {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve(ok: boolean): void }) | null>(null);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);
  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  const dialog = pending && <ConfirmDialog {...pending} onClose={close} />;
  return [confirm, dialog] as const;
}

function ConfirmDialog({ title, message, confirmLabel, danger, onClose }: ConfirmOptions & { onClose(ok: boolean): void }) {
  const tr = useTr();
  const id = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // « Annuler » a le focus : Entrée par réflexe ne valide rien. Le focus revient ensuite au bouton d'origine.
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose(false);
    } else if (e.key === 'Tab') {
      // Le focus reste dans la fenêtre
      e.preventDefault();
      (document.activeElement === cancelRef.current ? confirmRef : cancelRef).current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm" onClick={() => onClose(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={message ? `${id}-message` : undefined}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {message && (
          <p id={`${id}-message`} className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} type="button" className={buttonClass.secondary} onClick={() => onClose(false)}>
            {tr('Annuler', 'Cancel')}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className={
              danger
                ? 'inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700'
                : buttonClass.primary
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
