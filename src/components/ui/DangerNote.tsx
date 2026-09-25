import type { DangerLevel } from '../../types/command';

const STYLE: Record<Exclude<DangerLevel, 'safe'>, { box: string; label: string }> = {
  caution: {
    box: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200',
    label: 'Attention',
  },
  danger: {
    box: 'border-red-200 bg-red-50 text-red-900 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200',
    label: 'Danger',
  },
};

export function DangerNote({ level, note, className = '' }: { level: DangerLevel; note: string; className?: string }) {
  if (level === 'safe') return null;
  const s = STYLE[level];
  return (
    <p role="note" className={`rounded-lg border px-4 py-3 text-sm ${s.box} ${className}`}>
      <strong className="font-semibold">{s.label} : </strong>
      {note}
    </p>
  );
}
