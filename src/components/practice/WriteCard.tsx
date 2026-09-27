import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { WriteExercise } from '../../data/exercises';
import { checkCommand, type CheckResult } from '../../lib/exercise';
import { buttonClass, Feedback } from './Feedback';
import { useTr } from '../../i18n';

/** `onAnswer` : appelé à chaque vérification, avec la réponse et l'aide déjà affichée. */
export function WriteCard({ exercise, onAnswer }: { exercise: WriteExercise; onAnswer(correct: boolean, answer: string, usedHelp: boolean): void }) {
  const inputId = useId();
  const tr = useTr();
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const check = () => {
    if (result?.ok) return; // déjà réussi : ne pas compter un second essai
    const r = checkCommand(answer, exercise.solutions, exercise.ignoreOptions);
    setResult(r);
    onAnswer(r.ok, answer, showHint || showSolution);
  };

  const others = exercise.solutions.slice(1);

  return (
    <div className="space-y-5">
      <p className="text-lg leading-relaxed text-balance">{exercise.prompt}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
        className="space-y-3"
      >
        <label htmlFor={inputId} className="sr-only">
          {tr('Votre commande', 'Your command')}
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 shadow-sm focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-within:border-indigo-500">
          <span aria-hidden="true" className="select-none font-mono text-indigo-500">
            $
          </span>
          <input
            id={inputId}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (result && !result.ok) setResult(null);
            }}
            placeholder={tr('Tapez votre commande…', 'Type your command…')}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            className="h-12 w-full min-w-0 bg-transparent font-mono outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={buttonClass.primary} disabled={!answer.trim()}>
            {tr('Vérifier', 'Check')}
          </button>
          <button type="button" className={buttonClass.secondary} onClick={() => setShowHint(true)} disabled={showHint}>
            {tr('Indice', 'Hint')}
          </button>
          <button type="button" className={buttonClass.secondary} onClick={() => setShowSolution(true)} disabled={showSolution}>
            {tr('Voir la solution', 'Show the solution')}
          </button>
        </div>
      </form>

      {result?.ok && (
        <Feedback tone="success" title={tr('Bravo, c’est correct !', 'Well done, that’s correct!')}>
          {result.matched !== answer.trim() && (
            <p>
              {tr('Solution de référence :', 'Reference solution:')} <code className="font-mono">{result.matched}</code>
            </p>
          )}
          <Link to={`/?c=${encodeURIComponent(answer)}`} className="mt-1 inline-block underline underline-offset-2">
            {tr('Voir l’explication de votre commande →', 'See the explanation of your command →')}
          </Link>
        </Feedback>
      )}
      {result && !result.ok && (
        <Feedback tone="error" title={tr('Pas encore…', 'Not yet…')}>
          <ul className="list-inside list-disc space-y-0.5">
            {result.messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Feedback>
      )}
      {showHint && (
        <Feedback tone="info" title={tr('Indice', 'Hint')}>
          {exercise.hint}
        </Feedback>
      )}
      {showSolution && (
        <Feedback tone="info" title={tr('Solution', 'Solution')}>
          <code className="font-mono">{exercise.solutions[0]}</code>
          {others.length > 0 && (
            <p className="mt-1">
              {tr('Également acceptées :', 'Also accepted:')}{' '}
              {others.map((s, i) => (
                <span key={s}>
                  {i > 0 && ', '}
                  <code className="font-mono">{s}</code>
                </span>
              ))}
            </p>
          )}
          <Link to={`/?c=${encodeURIComponent(exercise.solutions[0]!)}`} className="mt-1 inline-block underline underline-offset-2">
            {tr('Comprendre la solution →', 'Understand the solution →')}
          </Link>
        </Feedback>
      )}
    </div>
  );
}
