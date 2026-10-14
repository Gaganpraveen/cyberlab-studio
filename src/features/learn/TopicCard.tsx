import { BookOpen, Circle, FlaskConical } from 'lucide-react';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/primitives';
import type { TopicRecord } from '@/content/catalog';
import { cn } from '@/lib/cn';
import { useProgress } from '@/lib/progress';

import { topicStatus } from './catalogStats';

/** A single topic tile for the topic map. Links to the lesson when one exists. */
export function TopicCard({ topic }: { topic: TopicRecord }) {
  const status = topicStatus(topic.id);
  const progress = useProgress();
  const viewed = Boolean(progress.lessons[topic.id]?.viewedAt);
  const completed = Boolean(progress.lessons[topic.id]?.completedAt);
  const ready = status.hasLesson;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-fg-subtle font-mono text-xs">{topic.id}</span>
        <span className="flex items-center gap-1">
          {status.hasLab && (
            <FlaskConical className="text-accent size-3.5" aria-label="Has a lab" />
          )}
          {ready ? (
            <BookOpen className="text-success size-3.5" aria-label="Lesson ready" />
          ) : (
            <Circle className="text-fg-subtle size-3.5" aria-label="Coming soon" />
          )}
        </span>
      </div>
      <h3
        className={cn('mt-2 text-sm leading-snug font-medium', ready ? 'text-fg' : 'text-fg-muted')}
      >
        {topic.title}
      </h3>
      {!ready && <span className="text-fg-subtle mt-auto pt-2 text-xs">Coming soon</span>}
      {completed && (
        <span className="mt-auto pt-2">
          <Badge tone="success">Completed</Badge>
        </span>
      )}
      {ready && viewed && !completed && (
        <span className="mt-auto pt-2">
          <Badge tone="neutral">In progress</Badge>
        </span>
      )}
    </>
  );

  const classes = cn(
    'flex min-h-28 flex-col rounded-xl border p-3 transition-colors',
    ready
      ? 'bg-surface border-line hover:border-accent/50 hover:bg-surface-2'
      : 'border-line border-dashed bg-transparent',
  );

  if (!ready) {
    return (
      <div className={classes} aria-label={`${topic.title}. Coming soon.`}>
        {inner}
      </div>
    );
  }

  return (
    <Link to={`/learn/${topic.id.toLowerCase()}`} className={classes}>
      {inner}
    </Link>
  );
}
