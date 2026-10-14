import { CircleAlert, CircleCheck, CircleX, Info, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/cn';

export type EvidenceLevel = 'info' | 'success' | 'warning' | 'danger';

export interface EvidenceEntry {
  id: string;
  /** ISO timestamp or a simulated clock label like "t=12s". */
  time: string;
  level: EvidenceLevel;
  message: string;
  /** Optional raw detail shown in monospace (a query, a header, a payload). */
  detail?: string;
}

const icons = {
  info: Info,
  success: CircleCheck,
  warning: CircleAlert,
  danger: CircleX,
} as const;

const tones: Record<EvidenceLevel, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

let counter = 0;

/** Create an evidence entry with a unique id and the current time. */
export function evidence(level: EvidenceLevel, message: string, detail?: string): EvidenceEntry {
  counter += 1;
  return {
    id: `${Date.now().toString(36)}-${counter}`,
    time: new Date().toISOString(),
    level,
    message,
    ...(detail !== undefined ? { detail } : {}),
  };
}

function formatTime(time: string): string {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return time;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * The evidence panel: an append-only, screen-reader-announced log of what the
 * lab actually did. Labs push entries; nothing here is decorative.
 */
export function EvidenceLog({
  entries,
  onClear,
  title = 'Evidence log',
  className,
}: {
  entries: EvidenceEntry[];
  onClear?: () => void;
  title?: string;
  className?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [entries.length]);

  return (
    <section className={cn('flex h-full min-h-0 flex-col', className)} aria-label={title}>
      <div className="border-line flex h-10 shrink-0 items-center justify-between border-b px-4">
        <h2 className="text-fg-muted text-xs font-semibold tracking-[0.1em] uppercase">{title}</h2>
        <div className="flex items-center gap-3">
          <span className="text-fg-subtle text-xs tabular-nums">{entries.length} events</span>
          {onClear && entries.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-fg-subtle hover:text-fg inline-flex items-center gap-1 text-xs"
            >
              <Trash2 className="size-3.5" aria-hidden /> Clear
            </button>
          )}
        </div>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2 font-mono text-[0.8125rem]"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {entries.length === 0 ? (
          <p className="text-fg-subtle px-2 py-3 font-sans text-sm">
            Nothing yet. Actions you take in the lab appear here as evidence.
          </p>
        ) : (
          <ol className="space-y-0.5">
            {entries.map((entry) => {
              const Icon = icons[entry.level];
              return (
                <li
                  key={entry.id}
                  className="hover:bg-surface-2 animate-fade-in flex gap-2.5 rounded-md px-2 py-1.5"
                >
                  <span className="text-fg-subtle shrink-0 tabular-nums">{formatTime(entry.time)}</span>
                  <Icon className={cn('mt-0.5 size-3.5 shrink-0', tones[entry.level])} aria-hidden />
                  <span className="sr-only">{entry.level}:</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-fg font-sans text-[0.8125rem] leading-snug">
                      {entry.message}
                    </div>
                    {entry.detail && (
                      <pre className="text-fg-muted mt-1 overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap break-all">
                        {entry.detail}
                      </pre>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
