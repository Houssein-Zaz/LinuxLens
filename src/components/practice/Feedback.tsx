import type { ReactNode } from 'react';

const STYLE = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200',
  error: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200',
  info: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300',
};

export function Feedback({ tone, title, children }: { tone: keyof typeof STYLE; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === 'info' ? undefined : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${STYLE[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
    </div>
  );
}

export const buttonClass = {
  primary:
    'inline-flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-400',
  secondary:
    'inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300',
};
