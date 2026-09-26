import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';

const inputClass =
  'h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none transition-shadow focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 aria-[invalid=true]:border-red-300 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-indigo-500 dark:aria-[invalid=true]:border-red-500/60';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
}

export function TextField({ label, hint, error, ...input }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
        className={inputClass}
        {...input}
      />
      {(error || hint) && (
        <p id={`${id}-hint`} className={`mt-1 text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function PasswordField({ label, hint, error, ...input }: FieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          className={`${inputClass} pr-24`}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {visible ? 'Masquer' : 'Afficher'}
        </button>
      </div>
      {(error || hint) && (
        <p id={`${id}-hint`} className={`mt-1 text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
      {children}
    </p>
  );
}

export function FormSuccess({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
      {children}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
    >
      {pending ? 'Un instant…' : children}
    </button>
  );
}
