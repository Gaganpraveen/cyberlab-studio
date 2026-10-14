import { CheckCircle2, ChevronDown, Flag, Lightbulb, Lock, Trophy } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { DifficultyBadge } from '@/components/ui/badges';
import { Badge, inputClasses } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import {
  challengeCompletion,
  recordChallengeAttempt,
  recordHintUsed,
  recordSolutionRevealed,
  useProgress,
} from '@/lib/progress';

import { checkAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';

const completionLabel = {
  'not-started': null,
  attempted: { tone: 'neutral', text: 'Attempted' },
  'with-support': { tone: 'info', text: 'Completed with support' },
  independent: { tone: 'success', text: 'Completed independently' },
} as const;

/**
 * One challenge: statement, progressive hints, answer/flag submission, and a
 * worked solution. Hint and solution use are recorded honestly (spec A05).
 */
export function ChallengeCard({
  challenge,
  defaultOpen = false,
  className,
}: {
  challenge: ChallengeDefinition;
  defaultOpen?: boolean;
  className?: string;
}) {
  const progress = useProgress();
  const record = progress.challenges[challenge.id];
  const status = challengeCompletion(record);
  const solved = Boolean(record?.solvedAt);
  const hintsShown = record?.hintsUsed ?? 0;
  const [open, setOpen] = useState(defaultOpen);
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<null | 'correct' | 'incorrect'>(null);
  const [showSolution, setShowSolution] = useState(false);
  const inputId = useId();
  const panelId = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    const correct = checkAnswer(challenge, value);
    recordChallengeAttempt(challenge.id, correct);
    setFeedback(correct ? 'correct' : 'incorrect');
  };

  const label = completionLabel[status];

  return (
    <article
      id={challenge.id}
      className={cn(
        'bg-surface border-line scroll-mt-24 rounded-xl border transition-colors',
        solved && 'border-success/40',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
      >
        <span
          className={cn(
            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border',
            solved
              ? 'bg-success-soft border-success/40 text-success'
              : 'bg-surface-2 border-line text-fg-subtle',
          )}
          aria-hidden
        >
          {solved ? <CheckCircle2 className="size-4" /> : <Flag className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-fg block font-medium">{challenge.title}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <DifficultyBadge difficulty={challenge.difficulty} />
            <Badge tone="neutral" icon={<Trophy className="size-3" aria-hidden />}>
              {challenge.points} pts
            </Badge>
            {label && <Badge tone={label.tone}>{label.text}</Badge>}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'text-fg-subtle mt-1 size-4 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div id={panelId} className="border-line animate-fade-in space-y-4 border-t px-4 py-4">
          <Markdown compact>{challenge.prompt}</Markdown>

          {challenge.kind === 'task' ? (
            <div
              className={cn(
                'rounded-lg border px-3 py-2 text-sm',
                solved
                  ? 'bg-success-soft border-success/30 text-success'
                  : 'bg-surface-2 border-line text-fg-muted',
              )}
            >
              {solved
                ? 'Verified by the lab: this task is complete.'
                : 'The lab checks this task automatically when you complete it.'}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-2">
              <label htmlFor={inputId} className="text-fg-muted block text-sm font-medium">
                {challenge.kind === 'flag' ? 'Submit the flag' : 'Your answer'}
              </label>
              <div className="flex gap-2">
                <input
                  id={inputId}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setFeedback(null);
                  }}
                  placeholder={challenge.kind === 'flag' ? 'CTF{...}' : 'Type your answer'}
                  autoComplete="off"
                  spellCheck={false}
                  className={cn(inputClasses, 'font-mono')}
                />
                <Button type="submit" variant="primary" disabled={!value.trim()}>
                  Check
                </Button>
              </div>
              <div aria-live="polite" className="min-h-5 text-sm">
                {feedback === 'correct' && (
                  <span className="text-success inline-flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="size-4" aria-hidden /> Correct. Nicely done.
                  </span>
                )}
                {feedback === 'incorrect' && (
                  <span className="text-danger">Not quite. Check the evidence and try again.</span>
                )}
              </div>
            </form>
          )}

          {challenge.hints.length > 0 && (
            <div className="space-y-2">
              {challenge.hints.slice(0, hintsShown).map((hint, i) => (
                <div
                  key={i}
                  className="bg-warning-soft border-warning/25 animate-fade-in flex gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <Lightbulb className="text-warning mt-0.5 size-4 shrink-0" aria-hidden />
                  {/* Hints are written in Markdown, like the prompt and the solution. */}
                  <Markdown compact className="min-w-0 [&_p]:text-fg-muted">
                    {`**Hint ${i + 1}.** ${hint}`}
                  </Markdown>
                </div>
              ))}
              {hintsShown < challenge.hints.length && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Lightbulb className="size-3.5" aria-hidden />}
                  onClick={() => recordHintUsed(challenge.id, hintsShown)}
                >
                  Show hint {hintsShown + 1} of {challenge.hints.length}
                </Button>
              )}
            </div>
          )}

          <div className="border-line border-t pt-3">
            {showSolution || record?.solutionRevealed ? (
              <div className="space-y-2">
                <div className="text-fg-subtle text-xs font-semibold tracking-[0.1em] uppercase">
                  Worked solution
                </div>
                <Markdown compact>{challenge.solution}</Markdown>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                icon={<Lock className="size-3.5" aria-hidden />}
                onClick={() => {
                  recordSolutionRevealed(challenge.id);
                  setShowSolution(true);
                }}
              >
                Reveal worked solution
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
