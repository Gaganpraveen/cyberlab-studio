import { HoverCard, Popover } from 'radix-ui';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router';

import { getTerm } from '@/content/glossary';

const panelClasses =
  'bg-surface border-line-strong shadow-elevated animate-fade-in z-50 w-80 rounded-xl border p-4 text-left';

function TermCard({ termId }: { termId: string }) {
  const term = getTerm(termId);
  if (!term) {
    return <p className="text-fg-muted text-sm">This term is not in the glossary yet.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="text-fg-subtle flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">
        <BookOpen className="size-3" aria-hidden />
        Glossary
      </div>
      <div className="text-fg font-sans text-base font-semibold">{term.term}</div>
      <p className="text-fg-muted font-sans text-sm leading-relaxed">{term.short}</p>
      <Link
        to={`/glossary/${term.id}`}
        className="text-accent-text inline-flex items-center gap-1 font-sans text-sm font-medium hover:underline"
      >
        Open in glossary <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/**
 * An inline glossary term. Hover (pointer) shows a preview card; click or
 * Enter opens the same card as a popover, so it works with keyboard and touch.
 */
export function TermLink({ termId, children }: { termId: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const known = Boolean(getTerm(termId));
  const triggerClasses =
    'cursor-help rounded-sm text-fg underline decoration-dotted decoration-accent-text/70 underline-offset-[3px] ' +
    'hover:decoration-accent-text hover:bg-accent-soft transition-colors';

  if (!known) return <span>{children}</span>;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <HoverCard.Root openDelay={250} closeDelay={120}>
        <HoverCard.Trigger asChild>
          <Popover.Trigger asChild>
            <button type="button" className={triggerClasses} aria-haspopup="dialog">
              {children}
            </button>
          </Popover.Trigger>
        </HoverCard.Trigger>
        {!open && (
          <HoverCard.Portal>
            <HoverCard.Content sideOffset={6} className={panelClasses}>
              <TermCard termId={termId} />
            </HoverCard.Content>
          </HoverCard.Portal>
        )}
      </HoverCard.Root>
      <Popover.Portal>
        <Popover.Content sideOffset={6} className={panelClasses}>
          <TermCard termId={termId} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
