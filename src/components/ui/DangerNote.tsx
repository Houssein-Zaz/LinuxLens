import type { DangerLevel } from '../../types/command';
import { useTr } from '../../i18n';

const STYLE: Record<Exclude<DangerLevel, 'safe'>, { box: string; label: string }> = {
  caution: {
    box: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200',
    label: 'caution',
  },
  danger: {
    box: 'border-red-200 bg-red-50 text-red-900 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200',
    label: 'danger',
  },
};

export function DangerNote({ level, note, className = '' }: { level: DangerLevel; note: string; className?: string }) {
  const tr = useTr();
  if (level === 'safe') return null;
  const s = STYLE[level];
  const label = level === 'caution' ? tr('Attention', 'Caution') : tr('Danger', 'Danger');
  return (
    <p role="note" className={`rounded-lg border px-4 py-3 text-sm ${s.box} ${className}`}>
      <strong className="font-semibold">
        {label}
        {tr(' : ', ': ')}
      </strong>
      {note}
    </p>
  );
}
