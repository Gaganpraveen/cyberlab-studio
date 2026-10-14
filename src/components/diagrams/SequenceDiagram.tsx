import { ChevronLeft, ChevronRight, ListOrdered, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { resolveReducedMotion, useSettings } from '@/lib/settings';

import { type MessageStyle, parseSequence, type SequenceStep } from './sequence';

/**
 * Renders a `sequence` code block from a lesson as an animated sequence
 * diagram. Steps play in order the first time the diagram scrolls into view;
 * "Step through" lets an instructor reveal one message at a time (the arrow
 * keys work too). Screen readers get the same steps as an ordered list.
 */

const STEP_MS = 700;

type Mode = 'static' | 'playing' | 'manual';

function describeStep(step: SequenceStep, label: (id: string) => string): string {
  if (step.kind === 'note') {
    return step.over ? `Note over ${label(step.over)}: ${step.text}` : `Note: ${step.text}`;
  }
  const from = label(step.from);
  const to = label(step.to);
  if (step.style === 'blocked') return `Blocked: ${from} to ${to}: ${step.text}`;
  if (step.style === 'response') return `Reply from ${from} to ${to}: ${step.text}`;
  return `${from} to ${to}: ${step.text}`;
}

const lineStyles: Record<MessageStyle, string> = {
  request: 'border-fg-muted border-solid',
  response: 'border-fg-subtle border-dashed',
  blocked: 'border-danger border-dotted',
};

function Arrowhead({ direction, style }: { direction: 'left' | 'right'; style: MessageStyle }) {
  if (style === 'blocked') {
    return (
      <span
        className={cn(
          'bg-canvas text-danger absolute top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full',
          direction === 'right' ? '-right-2.5' : '-left-2.5',
        )}
      >
        <X className="size-4" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <svg
      viewBox="0 0 10 10"
      className={cn(
        'absolute top-1/2 size-2.5 -translate-y-1/2',
        direction === 'right' ? '-right-px' : '-left-px rotate-180',
        style === 'response' ? 'text-fg-subtle' : 'text-fg-muted',
      )}
      aria-hidden
    >
      {style === 'response' ? (
        <path d="M1 1 L9 5 L1 9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      ) : (
        <path d="M0 0 L10 5 L0 10 Z" fill="currentColor" />
      )}
    </svg>
  );
}

/** The step's number; `onTint` gives it more contrast on a tinted note. */
function StepNumber({ n, onTint = false }: { n: number; onTint?: boolean }) {
  return (
    <span
      className={cn(
        'mr-1.5 font-mono text-[0.6875rem] tabular-nums',
        onTint ? 'text-fg-muted' : 'text-fg-subtle',
      )}
    >
      {n}
    </span>
  );
}

export function SequenceDiagram({ source }: { source: string }) {
  const { diagram, errors } = useMemo(() => parseSequence(source), [source]);
  const settings = useSettings();
  const reduced = resolveReducedMotion(settings.motion);
  const total = diagram.steps.length;
  const figureRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const canAutoplay =
    !reduced && typeof window !== 'undefined' && 'IntersectionObserver' in window && total > 1;
  const [shown, setShown] = useState(() => (canAutoplay ? 0 : total));
  const [mode, setMode] = useState<Mode>(canAutoplay ? 'playing' : 'static');
  const [started, setStarted] = useState(!canAutoplay);

  // Start playing the first time at least a third of the diagram is visible.
  useEffect(() => {
    if (started || !figureRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(figureRef.current);
    return () => observer.disconnect();
  }, [started]);

  // Playing ends by itself once every step is shown.
  const playing = mode === 'playing' && shown < total;
  useEffect(() => {
    if (!started || !playing) return;
    const timer = window.setTimeout(() => setShown((s) => s + 1), shown === 0 ? 150 : STEP_MS);
    return () => window.clearTimeout(timer);
  }, [started, playing, shown]);

  // In step-through mode, arrow keys move between steps while focus is in the diagram.
  useEffect(() => {
    const el = figureRef.current;
    if (!el || mode !== 'manual') return;
    nextRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setShown((s) => Math.min(total, s + 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setShown((s) => Math.max(1, s - 1));
      } else if (event.key === 'Escape') {
        setShown(total);
        setMode('static');
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [mode, total]);

  if (errors.length > 0 || diagram.participants.length === 0) {
    return (
      <pre className="language-text">
        <code>{source}</code>
      </pre>
    );
  }

  const n = diagram.participants.length;
  const col = 100 / n;
  const index = new Map(diagram.participants.map((p, i) => [p.id, i]));
  const label = (id: string) => diagram.participants[index.get(id) ?? 0]?.label ?? id;
  const center = (id: string) => ((index.get(id) ?? 0) + 0.5) * col;

  const replay = () => {
    setStarted(true);
    setShown(0);
    setMode('playing');
  };
  const stepThrough = () => {
    setStarted(true);
    setShown(1);
    setMode('manual');
  };
  const showAll = () => {
    setShown(total);
    setMode('static');
  };
  const prev = () => setShown((s) => Math.max(1, s - 1));
  const next = () => setShown((s) => Math.min(total, s + 1));

  const controlButton =
    'text-fg-muted hover:text-fg hover:bg-surface-3 inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors disabled:opacity-40';

  return (
    <figure
      ref={figureRef}
      className="not-prose border-line bg-surface my-8 overflow-hidden rounded-xl border"
    >
      <figcaption className="border-line flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <span className="text-fg text-sm font-semibold">{diagram.title ?? 'Sequence diagram'}</span>
        <span className="flex items-center gap-1 print:hidden">
          {mode === 'manual' ? (
            <>
              <button
                type="button"
                className={controlButton}
                onClick={prev}
                disabled={shown <= 1}
                aria-label="Previous step"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <span className="text-fg-subtle px-1 text-xs tabular-nums" aria-live="polite">
                Step {shown} of {total}
              </span>
              <button
                ref={nextRef}
                type="button"
                className={controlButton}
                onClick={next}
                disabled={shown >= total}
                aria-label="Next step"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
              <button type="button" className={controlButton} onClick={showAll}>
                Show all
              </button>
            </>
          ) : (
            <>
              <button type="button" className={controlButton} onClick={replay}>
                <RotateCcw className="size-3.5" aria-hidden /> Replay
              </button>
              <button type="button" className={controlButton} onClick={stepThrough}>
                <ListOrdered className="size-3.5" aria-hidden /> Step through
              </button>
            </>
          )}
        </span>
      </figcaption>

      <div className="overflow-x-auto px-2 pt-4 pb-5" aria-hidden>
        <div style={{ minWidth: `${Math.max(n * 9, 20)}rem` }}>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {diagram.participants.map((p) => (
              <div key={p.id} className="flex justify-center px-2">
                <div className="border-line-strong bg-surface-2 text-fg rounded-lg border px-3 py-1.5 text-center text-[0.8125rem] leading-tight font-semibold">
                  {p.label}
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-1 pt-2">
            {diagram.participants.map((p) => (
              <div
                key={p.id}
                className="border-line-strong absolute top-0 bottom-0 border-l border-dashed"
                style={{ left: `${center(p.id)}%` }}
              />
            ))}

            {diagram.steps.map((step, i) => {
              const visible = i < shown;
              const current = mode === 'manual' && i === shown - 1;
              const rowClass = cn(
                'relative py-1.5 transition-[opacity,transform] duration-500 ease-out-soft print:translate-y-0 print:opacity-100',
                visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
              );

              if (step.kind === 'note') {
                const left = step.over ? center(step.over) : 50;
                const width = step.over ? Math.max(col * 0.9, 22) : 100 - col * 0.2;
                return (
                  <div key={i} className={rowClass}>
                    <div
                      className={cn(
                        'bg-warning-soft border-warning/30 text-fg relative rounded-lg border px-3 py-1.5 text-center text-[0.8125rem] leading-snug',
                        current && 'ring-accent ring-2',
                      )}
                      style={{
                        marginLeft: `${left}%`,
                        width: `${width}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <StepNumber n={i + 1} onTint />
                      {step.text}
                    </div>
                  </div>
                );
              }

              const from = center(step.from);
              const to = center(step.to);

              if (step.from === step.to) {
                return (
                  <div key={i} className={rowClass}>
                    <div
                      className="relative flex items-start gap-2 pl-1"
                      style={{ marginLeft: `${from}%`, maxWidth: `${Math.max(col, 30)}%` }}
                    >
                      <svg viewBox="0 0 28 22" className="text-fg-muted h-[22px] w-7 shrink-0">
                        <path
                          d="M0 3 H20 Q26 3 26 11 Q26 19 20 19 H5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeDasharray={step.style === 'response' ? '3 3' : undefined}
                        />
                        <path d="M6 15 L1 19 L6 23" fill="none" stroke="currentColor" />
                      </svg>
                      <span
                        className={cn(
                          'text-fg rounded px-1 text-[0.8125rem] leading-snug',
                          current && 'ring-accent ring-2',
                        )}
                      >
                        <StepNumber n={i + 1} />
                        {step.text}
                      </span>
                    </div>
                  </div>
                );
              }

              const left = Math.min(from, to);
              const width = Math.abs(from - to);
              const direction = to > from ? 'right' : 'left';
              return (
                <div key={i} className={rowClass}>
                  <div
                    className="relative px-3 pb-3"
                    style={{ marginLeft: `${left}%`, width: `${width}%` }}
                  >
                    <div
                      className={cn(
                        'mx-auto w-fit max-w-full rounded px-1 text-center text-[0.8125rem] leading-snug',
                        step.style === 'blocked' ? 'text-danger' : 'text-fg',
                        current && 'ring-accent ring-2',
                      )}
                    >
                      <StepNumber n={i + 1} />
                      {step.text}
                    </div>
                    <div
                      className={cn(
                        'absolute right-0 bottom-1 left-0 h-0 border-t-2 transition-transform duration-500 ease-out-soft print:scale-x-100',
                        lineStyles[step.style],
                        direction === 'right' ? 'origin-left' : 'origin-right',
                        visible ? 'scale-x-100' : 'scale-x-0',
                      )}
                    >
                      <Arrowhead direction={direction} style={step.style} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ol className="sr-only">
        {diagram.steps.map((step, i) => (
          <li key={i}>{describeStep(step, label)}</li>
        ))}
      </ol>
    </figure>
  );
}
