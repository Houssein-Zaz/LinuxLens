import { RIGHT_LABEL, RIGHTS, WHO, WHO_LABEL, type Permissions, type Right, type Who } from '../../lib/permissions';
import { useTr } from '../../i18n';

const RIGHT_VALUE: Record<Right, number> = { read: 4, write: 2, execute: 1 };
const RIGHT_LETTER: Record<Right, string> = { read: 'r', write: 'w', execute: 'x' };

interface Props {
  value: Permissions;
  onToggle(who: Who, right: Right): void;
}

export function PermissionGrid({ value, onToggle }: Props) {
  const tr = useTr();
  return (
    <table className="w-full border-separate border-spacing-0 text-sm">
      <caption className="sr-only">{tr('Grille des permissions : cochez les droits de chaque catégorie', 'Permissions grid: tick the permissions for each category')}</caption>
      <thead>
        <tr>
          <td />
          {RIGHTS.map((r) => (
            <th key={r} scope="col" className="pb-3 text-center font-medium">
              <span className="block capitalize">{RIGHT_LABEL[r]}</span>
              <span className="font-mono text-xs font-normal text-zinc-500 dark:text-zinc-400">
                {RIGHT_LETTER[r]} = {RIGHT_VALUE[r]}
              </span>
            </th>
          ))}
          <th scope="col" className="pb-3 text-right font-medium">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {WHO.map((w) => {
          const total = RIGHTS.reduce((sum, r) => sum + (value[w][r] ? RIGHT_VALUE[r] : 0), 0);
          return (
            <tr key={w}>
              <th scope="row" className="border-t border-zinc-100 py-3 pr-4 text-left font-medium capitalize dark:border-zinc-800">
                {WHO_LABEL[w]}
              </th>
              {RIGHTS.map((r) => {
                const checked = value[w][r];
                return (
                  <td key={r} className="border-t border-zinc-100 py-3 text-center dark:border-zinc-800">
                    <label className="inline-grid cursor-pointer place-items-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(w, r)}
                        aria-label={tr(`${RIGHT_LABEL[r]} pour ${WHO_LABEL[w]}`, `${RIGHT_LABEL[r]} for ${WHO_LABEL[w]}`)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`grid size-11 place-items-center rounded-xl font-mono text-base ring-1 ring-inset transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-500 ${
                          checked
                            ? 'bg-indigo-600 text-white ring-indigo-600 dark:bg-indigo-500 dark:ring-indigo-500'
                            : 'bg-white text-zinc-400 ring-zinc-200 hover:ring-indigo-300 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-zinc-700 dark:hover:ring-indigo-500/60'
                        }`}
                      >
                        {checked ? RIGHT_LETTER[r] : '-'}
                      </span>
                    </label>
                  </td>
                );
              })}
              <td className="border-t border-zinc-100 py-3 text-right font-mono text-2xl font-semibold text-indigo-600 dark:border-zinc-800 dark:text-indigo-400">
                {total}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
