import { ChevronRight, Lock, Pause, Play, ScanSearch } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { analyzeHost, inspect } from '@/labs/homograph/engine';
import { cn } from '@/lib/cn';
import { resolveReducedMotion, useSettings } from '@/lib/settings';

/**
 * The home page's live demo: a look-alike domain is typed into an address
 * bar, inspected character by character, and decoded to the Punycode name
 * the browser really uses. It runs on the homograph lab's own engine and the
 * browser's URL parser, so every code point and xn-- name shown is real.
 */

const EXAMPLES = ['bаnk.example', 'ѕhop.example', 'pоrtal.college.example'];

type Phase = 'typing' | 'scanning' | 'flagged' | 'decoded';

const TYPE_MS = 55;
const SCAN_MS = 70;

export function SpotTheFake() {
  const settings = useSettings();
  const reduced = resolveReducedMotion(settings.motion);
  const [example, setExample] = useState(0);
  const [phase, setPhase] = useState<Phase>(reduced ? 'decoded' : 'typing');
  const [tick, setTick] = useState(0);
  // Hovering or focusing the demo pauses it for a moment; the Pause button stops
  // it until pressed again (WCAG 2.2.2).
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);

  const domain = EXAMPLES[example]!;
  const cells = useMemo(() => inspect(domain), [domain]);
  const analysis = useMemo(() => analyzeHost(domain), [domain]);
  const suspicious = cells.filter((c) => !c.isAscii);
  const first = suspicious[0];

  useEffect(() => {
    if (reduced || paused || stopped) return;
    let delay: number;
    let next: () => void;
    if (phase === 'typing') {
      if (tick < cells.length) {
        delay = TYPE_MS;
        next = () => setTick((t) => t + 1);
      } else {
        delay = 450;
        next = () => {
          setPhase('scanning');
          setTick(0);
        };
      }
    } else if (phase === 'scanning') {
      if (tick < cells.length) {
        delay = SCAN_MS;
        next = () => setTick((t) => t + 1);
      } else {
        delay = 200;
        next = () => setPhase('flagged');
      }
    } else if (phase === 'flagged') {
      delay = 1400;
      next = () => setPhase('decoded');
    } else {
      delay = 3200;
      next = () => {
        setExample((e) => (e + 1) % EXAMPLES.length);
        setPhase('typing');
        setTick(0);
      };
    }
    const timer = window.setTimeout(next, delay);
    return () => window.clearTimeout(timer);
  }, [phase, tick, cells.length, reduced, paused, stopped]);

  const showNext = () => {
    setExample((e) => (e + 1) % EXAMPLES.length);
    setPhase(reduced || stopped ? 'decoded' : 'typing');
    setTick(0);
  };

  const typed = phase === 'typing' ? tick : cells.length;
  const flagged = phase === 'flagged' || phase === 'decoded';

  return (
    <div
      className="border-line-strong bg-canvas shadow-elevated relative overflow-hidden rounded-2xl border"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="border-line bg-surface flex items-center gap-2 border-b px-4 py-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="bg-surface-3 size-2.5 rounded-full" />
          <span className="bg-surface-3 size-2.5 rounded-full" />
          <span className="bg-surface-3 size-2.5 rounded-full" />
        </span>
        <span className="text-fg-subtle ml-2 text-xs font-medium">Spot the fake</span>
        {!reduced && (
          <button
            type="button"
            onClick={() => setStopped((s) => !s)}
            className="text-fg-muted hover:text-fg hover:bg-surface-2 ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
          >
            {stopped ? (
              <Play className="size-3.5" aria-hidden />
            ) : (
              <Pause className="size-3.5" aria-hidden />
            )}
            {stopped ? 'Play demo' : 'Pause demo'}
          </button>
        )}
      </div>

      <div className="space-y-5 p-5">
        <div className="border-line bg-surface flex items-center gap-2 rounded-lg border px-3 py-2.5">
          <Lock className="text-fg-subtle size-3.5 shrink-0" aria-hidden />
          <span className="text-fg-subtle font-mono text-sm">https://</span>
          <span className="flex min-w-0 font-mono text-sm" aria-hidden>
            {cells.map((cell, i) => {
              const scanning = phase === 'scanning' && i === tick;
              const bad = flagged && !cell.isAscii;
              return (
                <span
                  key={`${example}-${i}`}
                  className={cn(
                    'rounded-[3px] transition-colors duration-150',
                    i >= typed && 'opacity-0',
                    scanning && 'bg-accent-soft text-accent-text',
                    bad ? 'bg-danger-soft text-danger ring-danger/50 ring-1' : 'text-fg',
                  )}
                >
                  {cell.char}
                </span>
              );
            })}
            {phase === 'typing' && (
              <span className="bg-accent animate-pulse-dot ml-px inline-block h-4 w-[2px] self-center" />
            )}
          </span>
        </div>

        <div className="min-h-[9.5rem] space-y-3">
          <div
            className={cn(
              'flex items-center gap-2 text-sm transition-opacity duration-300',
              phase === 'typing' ? 'opacity-0' : 'opacity-100',
            )}
          >
            <ScanSearch className="text-accent-text size-4" aria-hidden />
            <span className="text-fg-muted">
              {phase === 'scanning'
                ? 'Inspecting each character…'
                : `${suspicious.length} of ${cells.length} characters are not plain ASCII`}
            </span>
          </div>

          {first && (
            <div
              className={cn(
                'border-danger/30 bg-danger-soft rounded-lg border px-3 py-2.5 transition-all duration-300',
                flagged ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
              )}
            >
              <div className="text-fg font-mono text-sm">
                “{first.char}” {first.codePointHex}
              </div>
              <div className="text-fg-muted mt-0.5 text-xs">
                {first.name}
                {first.confusable && <> · imitates the Latin letter “{first.confusable}”</>}
              </div>
            </div>
          )}

          <div
            className={cn(
              'transition-all duration-300',
              phase === 'decoded' ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
            )}
          >
            <div className="text-fg-subtle text-xs">What the browser actually looks up</div>
            <div className="text-fg mt-1 font-mono text-sm break-all">{analysis.ascii}</div>
            {analysis.mixedScript && (
              <div className="text-warning mt-1.5 text-xs">
                Mixed scripts in one name: {analysis.scripts.join(' + ')}
              </div>
            )}
          </div>
        </div>

        <div className="border-line flex items-center justify-between gap-3 border-t pt-4">
          <Link
            to="/labs/homograph"
            className="text-accent-text inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            Investigate more in the lab <ChevronRight className="size-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={showNext}
            className="text-fg-muted hover:text-fg hover:bg-surface-2 rounded-md px-2 py-1 text-xs transition-colors"
          >
            Next example
          </button>
        </div>
      </div>

      <p className="sr-only">
        {`Example: ${domain}. ${
          first
            ? `It contains ${first.name}, ${first.codePointHex}, which imitates a Latin letter.`
            : ''
        } The browser looks up ${analysis.ascii}.`}
      </p>
    </div>
  );
}
