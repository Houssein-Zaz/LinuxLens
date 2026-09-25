import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { PermExercise } from '../../data/exercises';
import { checkOctalAnswer, checkSymbolicAnswer } from '../../lib/exercise';
import { fromOctal, toOctal, toSymbolic } from '../../lib/permissions';
import { buttonClass, Feedback } from './Feedback';

export function PermCard({ exercise, onSolved }: { exercise: PermExercise; onSolved(): void }) {
  const inputId = useId();
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
    const ok = toOctalDir ? checkOctalAnswer(answer, symbolic) : checkSymbolicAnswer(answer, octal);
    setStatus(ok ? 'right' : 'wrong');
    if (ok) onSolved();
  };

  return (
    <div className="space-y-5">
      <p className="text-lg">
        {toOctalDir ? 'Convertissez ces permissions en notation octale :' : 'Écrivez ces permissions en notation symbolique (9 caractères, comme dans ls -l) :'}
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
          {toOctalDir ? 'Notation octale' : 'Notation symbolique'}
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
          Vérifier
        </button>
        <button type="button" className={buttonClass.secondary} onClick={() => setShowSolution(true)} disabled={showSolution}>
          Voir la solution
        </button>
      </form>

      {status === 'right' && <Feedback tone="success" title="Exact !" />}
      {status === 'wrong' && (
        <Feedback tone="error" title="Pas tout à fait.">
          Rappel : r = 4, w = 2, x = 1, à additionner pour le propriétaire, le groupe et les autres.
          {special && ' Un 4ᵉ chiffre en tête code les bits spéciaux : setuid = 4 (s chez le propriétaire), setgid = 2 (s dans le groupe), sticky = 1 (t chez les autres).'}
        </Feedback>
      )}
      {showSolution && (
        <Feedback tone="info" title="Solution">
          <code className="font-mono">{expected}</code>
          <Link to={`/chmod?mode=${octal}`} className="ml-3 underline underline-offset-2">
            Voir le détail dans le calculateur →
          </Link>
        </Feedback>
      )}
    </div>
  );
}
