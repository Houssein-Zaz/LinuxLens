import { useState } from 'react';
import { Link } from 'react-router';
import type { QuizExercise } from '../../data/exercises';
import { Feedback } from './Feedback';

export function QuizCard({ exercise, onAnswer }: { exercise: QuizExercise; onAnswer(correct: boolean, answer: string, usedHelp: boolean): void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === exercise.answer;

  return (
    <div className="space-y-5">
      <pre className="overflow-x-auto rounded-xl bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-100 dark:ring-1 dark:ring-zinc-800">
        <span className="select-none text-indigo-400">$ </span>
        {exercise.command}
      </pre>
      <p className="text-lg" id={`${exercise.id}-q`}>
        {exercise.question}
      </p>

      <div role="radiogroup" aria-labelledby={`${exercise.id}-q`} className="grid gap-2">
        {exercise.choices.map((choice, i) => {
          const isAnswer = i === exercise.answer;
          const state = !answered ? 'idle' : isAnswer ? 'right' : i === picked ? 'wrong' : 'dim';
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={answered}
              onClick={() => {
                setPicked(i);
                onAnswer(isAnswer, choice, false);
              }}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                {
                  idle: 'border-zinc-200 bg-white hover:border-indigo-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-indigo-500',
                  right: 'border-emerald-300 bg-emerald-50 dark:border-emerald-400/40 dark:bg-emerald-400/10',
                  wrong: 'border-amber-300 bg-amber-50 dark:border-amber-400/40 dark:bg-amber-400/10',
                  dim: 'border-zinc-200 bg-white opacity-60 dark:border-zinc-800 dark:bg-zinc-900',
                }[state]
              }`}
            >
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-100 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {state === 'right' ? '✓' : state === 'wrong' ? '✗' : String.fromCharCode(65 + i)}
              </span>
              <span className="pt-0.5">{choice}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <Feedback tone={correct ? 'success' : 'error'} title={correct ? 'Bonne réponse !' : 'Ce n’est pas ça.'}>
          <p>{exercise.explanation}</p>
          <div className="mt-2 flex flex-wrap gap-x-4">
            <Link to={`/?c=${encodeURIComponent(exercise.command)}`} className="underline underline-offset-2">
              Décortiquer la commande →
            </Link>
            {!correct && (
              <button type="button" onClick={() => setPicked(null)} className="underline underline-offset-2">
                Réessayer
              </button>
            )}
          </div>
        </Feedback>
      )}
    </div>
  );
}
