import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { useId, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { recordQuiz } from '@/lib/progress';
import type { QuizQuestion } from '@/content/schema';

/** A short check-your-understanding quiz at the end of a lesson. */
export function LessonQuiz({ topicId, quiz }: { topicId: string; quiz: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const groupId = useId();

  const answeredCount = Object.keys(answers).length;
  const correctCount = quiz.reduce((n, q, i) => (answers[i] === q.answer ? n + 1 : n), 0);

  const submit = () => {
    setSubmitted(true);
    recordQuiz(topicId, correctCount, quiz.length);
  };

  return (
    <section className="mt-10" aria-label="Check your understanding">
      <h2 className="text-fg mb-1 flex items-center gap-2 text-lg font-semibold">
        <HelpCircle className="text-fg-subtle size-5" aria-hidden /> Check your understanding
      </h2>
      <p className="text-fg-muted mb-5 text-sm">
        Answer these to confirm the key ideas. Nothing here is graded; it is for your own learning.
      </p>

      <ol className="space-y-5">
        {quiz.map((question, qi) => {
          const chosen = answers[qi];
          return (
            <li key={qi} className="bg-surface border-line rounded-xl border p-4">
              <fieldset>
                <legend className="text-fg mb-3 font-medium">
                  {qi + 1}. {question.question}
                </legend>
                <div className="space-y-2">
                  {question.choices.map((choice, ci) => {
                    const selected = chosen === ci;
                    const isCorrect = ci === question.answer;
                    const showState = submitted && (selected || isCorrect);
                    return (
                      <label
                        key={ci}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                          !submitted && selected && 'border-accent bg-accent-soft',
                          !submitted && !selected && 'border-line hover:bg-surface-2',
                          showState && isCorrect && 'border-success/50 bg-success-soft',
                          showState && selected && !isCorrect && 'border-danger/50 bg-danger-soft',
                          submitted && !showState && 'border-line opacity-70',
                        )}
                      >
                        <input
                          type="radio"
                          name={`${groupId}-${qi}`}
                          checked={selected}
                          disabled={submitted}
                          onChange={() => setAnswers((a) => ({ ...a, [qi]: ci }))}
                          className="accent-accent mt-0.5 size-4 shrink-0"
                        />
                        <span className="text-fg flex-1">{choice}</span>
                        {showState && isCorrect && (
                          <CheckCircle2 className="text-success size-4 shrink-0" aria-label="Correct answer" />
                        )}
                        {showState && selected && !isCorrect && (
                          <XCircle className="text-danger size-4 shrink-0" aria-label="Your answer" />
                        )}
                      </label>
                    );
                  })}
                </div>
                {submitted && (
                  <div className="text-fg-muted mt-3 border-l-2 border-line pl-3 text-sm">
                    <Markdown compact>{question.explanation}</Markdown>
                  </div>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex items-center gap-4">
        {!submitted ? (
          <Button variant="primary" disabled={answeredCount < quiz.length} onClick={submit}>
            {answeredCount < quiz.length
              ? `Answer all ${quiz.length} to check`
              : 'Check my answers'}
          </Button>
        ) : (
          <>
            <div
              className={cn(
                'text-sm font-medium',
                correctCount === quiz.length ? 'text-success' : 'text-fg',
              )}
              role="status"
            >
              You got {correctCount} of {quiz.length} right.
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
              }}
            >
              Try again
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
