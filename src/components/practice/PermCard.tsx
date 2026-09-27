import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { PermExercise } from '../../data/exercises';
import { checkOctalAnswer, checkSymbolicAnswer } from '../../lib/exercise';
import { fromOctal, toOctal, toSymbolic } from '../../lib/permissions';
import { buttonClass, Feedback } from './Feedback';
import { useTr } from '../../i18n';

export function PermCard({ exercise, onAnswer }: { exercise: PermExercise; onAnswer(correct: boolean, answer: string, usedHelp: boolean): void }) {
  const inputId = useId();
  const tr = useTr();
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle');
  const [showSolution, setShowSolution] = useState(false);

  const perms = fromOctal(exercise.mode)!;
  const octal = toOctal(perms);
  const symbolic = toSymbolic(perms);
  const toOctalDir = exercise.direction === 'to-octal';
  const given = toOctalDir ? symbolic : octal;
  const expected = toOctalDir ? octal : symbolic;
  const special = perms.setuid || perms.setgid || perms.sticky;

  const check = () => {
    if (status === 'right') return; // déjà réussi : ne pas compter un second essai
    const ok = toOctalDir ? checkOctalAnswer(answer, symbolic) : checkSymbolicAnswer(answer, octal);
    setStatus(ok ? 'right' : 'wrong');
    onAnswer(ok, answer, showSolution);
  };

  return (
    <div className="space-y-5">
      <p className="text-lg">
        {toOctalDir
          ? tr('Convertissez ces permissions en notation octale :', 'Convert these permissions to octal notation:')
          : tr('Écrivez ces permissions en notation symbolique (9 caractères, comme dans ls -l) :', 'Write these permissions in symbolic notation (9 characters, as in ls -l):')}
      </p>
      <div className="font-mono text-4xl font-semibold tracking-wider text-indigo-600 dark:text-indigo-400">{given}</div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
        className="flex flex-wrap gap-2"
      >
        <label htmlFor={inputId} className="sr-only">
          {toOctalDir ? tr('Notation octale', 'Octal notation') : tr('Notation symbolique', 'Symbolic notation')}
        </label>
        <input
          id={inputId}
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            setStatus('idle');
          }}
          placeholder={toOctalDir ? '750' : 'rwxr-x---'}
          spellCheck={false}
          autoComplete="off"
          className="h-10 w-44 rounded-xl border border-zinc-200 bg-white px-3 font-mono shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-indigo-500"
        />
        <button type="submit" className={buttonClass.primary} disabled={!answer.trim()}>
          {tr('Vérifier', 'Check')}
        </button>
        <button type="button" className={buttonClass.secondary} onClick={() => setShowSolution(true)} disabled={showSolution}>
          {tr('Voir la solution', 'Show the solution')}
        </button>
      </form>

      {status === 'right' && <Feedback tone="success" title={tr('Exact !', 'Correct!')} />}
      {status === 'wrong' && (
        <Feedback tone="error" title={tr('Pas tout à fait.', 'Not quite.')}>
          {tr(
            'Rappel : r = 4, w = 2, x = 1, à additionner pour le propriétaire, le groupe et les autres.',
            'Reminder: r = 4, w = 2, x = 1, added up for the owner, the group and others.',
          )}
          {special &&
            tr(
              ' Un 4ᵉ chiffre en tête code les bits spéciaux : setuid = 4 (s chez le propriétaire), setgid = 2 (s dans le groupe), sticky = 1 (t chez les autres).',
              ' A leading 4th digit encodes the special bits: setuid = 4 (s for the owner), setgid = 2 (s in the group), sticky = 1 (t for others).',
            )}
        </Feedback>
      )}
      {showSolution && (
        <Feedback tone="info" title={tr('Solution', 'Solution')}>
          <code className="font-mono">{expected}</code>
          <Link to={`/chmod?mode=${octal}`} className="ml-3 underline underline-offset-2">
            {tr('Voir le détail dans le calculateur →', 'See the details in the calculator →')}
          </Link>
        </Feedback>
      )}
    </div>
  );
}
