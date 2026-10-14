import { BookOpen } from 'lucide-react';

import { AccessBadge } from '@/components/ui/badges';
import { LIBRARY_KIND_LABELS, type TopicReading } from '@/content/library';
import type { LibrarySource } from '@/content/schema';

export function sourceByline(source: LibrarySource): string {
  const authors = source.authors ?? [];
  const names =
    authors.length > 3 ? `${authors.slice(0, 2).join(', ')} et al.` : authors.join(', ');
  return [names, source.edition, source.year, source.publisher]
    .filter((part) => part !== undefined && part !== '')
    .join(' · ');
}

/** Library sources for a topic, with the chapters that cover it. */
export function ReadingList({ readings }: { readings: TopicReading[] }) {
  return (
    <ul className="border-line bg-surface divide-line divide-y rounded-xl border">
      {readings.map(({ source, sections }) => (
        <li key={source.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg hover:text-accent-text min-w-0 font-medium transition-colors"
            >
              {source.title}
            </a>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <span className="text-fg-subtle text-xs leading-5">
                {LIBRARY_KIND_LABELS[source.kind]}
              </span>
              <AccessBadge access={source.access} />
            </div>
          </div>
          <div className="text-fg-subtle mt-1 text-xs leading-relaxed">{sourceByline(source)}</div>
          {sections.length > 0 && (
            <ul className="mt-2.5 space-y-1">
              {sections.map((section) => (
                <li key={section.title} className="text-fg-muted flex gap-2 text-sm">
                  <BookOpen className="text-fg-subtle mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {section.url ? (
                    <a
                      href={section.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent-text underline-offset-2 hover:underline"
                    >
                      {section.title}
                    </a>
                  ) : (
                    <span>{section.title}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
