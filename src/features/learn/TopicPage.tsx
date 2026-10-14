import { ArrowLeft, ArrowRight, Check, Clock, FileText, FlaskConical, Link2 } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { Markdown } from '@/components/markdown/Markdown';
import { Button, ButtonLink } from '@/components/ui/Button';
import { LevelBadge, ReviewBadge } from '@/components/ui/badges';
import { Badge, Callout, EmptyState } from '@/components/ui/primitives';
import { getTopic, TOPICS } from '@/content/catalog';
import { getLesson } from '@/content/lessons';
import type { Lesson } from '@/content/schema';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { labsForTopic } from '@/labs/registry';
import { markLessonViewed, setLessonCompleted, useProgress } from '@/lib/progress';

import { LessonQuiz } from './LessonQuiz';

function TableOfContents({ lesson }: { lesson: Lesson }) {
  if (lesson.headings.length < 3) return null;
  return (
    <nav aria-label="On this page" className="space-y-2">
      <div className="text-fg-subtle text-xs font-semibold tracking-[0.1em] uppercase">
        On this page
      </div>
      <ul className="space-y-1.5 text-sm">
        {lesson.headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className="text-fg-muted hover:text-fg block border-l-2 border-transparent pl-3 leading-snug transition-colors hover:border-accent"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PrereqList({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <Callout tone="info" title="Before this, it helps to know">
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {ids.map((id) => {
          const topic = getTopic(id);
          const lesson = getLesson(id);
          return (
            <li key={id}>
              {lesson ? (
                <Link
                  to={`/learn/${id.toLowerCase()}`}
                  className="text-accent-text hover:underline"
                >
                  {topic?.title ?? id}
                </Link>
              ) : (
                <span>{topic?.title ?? id}</span>
              )}
            </li>
          );
        })}
      </ul>
    </Callout>
  );
}

function CompleteButton({ topicId }: { topicId: string }) {
  const progress = useProgress();
  const completed = Boolean(progress.lessons[topicId]?.completedAt);
  return (
    <Button
      variant={completed ? 'secondary' : 'primary'}
      icon={completed ? <Check className="size-4" aria-hidden /> : undefined}
      onClick={() => setLessonCompleted(topicId, !completed)}
    >
      {completed ? 'Completed' : 'Mark as complete'}
    </Button>
  );
}

export default function TopicPage() {
  const { topicId = '' } = useParams();
  const upper = topicId.toUpperCase();
  const topic = getTopic(upper);
  const lesson = getLesson(upper);
  useDocumentTitle(lesson?.title ?? topic?.title);

  useEffect(() => {
    if (lesson) markLessonViewed(lesson.topicId);
  }, [lesson]);

  if (!topic) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          icon={FileText}
          title="That topic doesn’t exist"
          action={<ButtonLink to="/learn">Open the topic map</ButtonLink>}
        />
      </PageContainer>
    );
  }

  const labs = labsForTopic(upper);
  const index = TOPICS.findIndex((t) => t.id === upper);
  const prev = index > 0 ? TOPICS[index - 1] : undefined;
  const next = index < TOPICS.length - 1 ? TOPICS[index + 1] : undefined;

  if (!lesson) {
    return (
      <PageContainer width="narrow">
        <Link
          to="/learn"
          className="text-fg-subtle hover:text-fg mb-6 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden /> Topic map
        </Link>
        <div className="space-y-4">
          <div className="text-fg-subtle font-mono text-sm">{topic.id}</div>
          <h1 className="text-fg text-3xl font-semibold tracking-tight">{topic.title}</h1>
          <Badge tone="warning">Lesson coming soon</Badge>
          <p className="text-fg-muted text-base leading-relaxed">
            This topic is on the roadmap. The planned activity is: {topic.activity.toLowerCase()}
          </p>
          {labs.length > 0 && (
            <Callout tone="accent" title="There is already a lab for this">
              {labs.map((lab) => (
                <ButtonLink key={lab.id} to={`/labs/${lab.id}`} variant="primary" className="mt-2">
                  <FlaskConical className="size-4" aria-hidden /> Open {lab.title}
                </ButtonLink>
              ))}
            </Callout>
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <div className="lg:grid lg:grid-cols-[1fr_15rem] lg:gap-10">
        <article className="min-w-0">
          <Link
            to="/learn"
            className="text-fg-subtle hover:text-fg mb-6 inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden /> {topic.domainTitle}
          </Link>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-fg-subtle font-mono text-sm">{lesson.topicId}</span>
            <LevelBadge level={lesson.level} />
            <ReviewBadge status={lesson.status} />
            <span className="text-fg-subtle inline-flex items-center gap-1 text-xs">
              <Clock className="size-3.5" aria-hidden /> {lesson.estimatedMinutes} min read
            </span>
          </div>

          <h1 className="text-fg text-[2rem] leading-tight font-semibold tracking-tight text-balance">
            {lesson.title}
          </h1>
          <p className="text-fg-muted mt-3 text-lg leading-relaxed text-pretty">{lesson.summary}</p>

          <div className="mt-6 space-y-4">
            <div className="bg-surface border-line rounded-xl border p-4">
              <div className="text-fg-subtle mb-2 text-xs font-semibold tracking-[0.1em] uppercase">
                What you will be able to do
              </div>
              <ul className="space-y-1.5">
                {lesson.objectives.map((objective) => (
                  <li key={objective} className="text-fg-muted flex gap-2 text-sm">
                    <ArrowRight className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
            <PrereqList ids={lesson.prerequisites} />
          </div>

          {labs.length > 0 && (
            <div className="border-accent/30 bg-accent-soft mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <FlaskConical className="text-accent-text size-5 shrink-0" aria-hidden />
                <div>
                  <div className="text-fg text-sm font-semibold">Practice this in the lab</div>
                  <div className="text-fg-muted text-xs">
                    Do the attack, then build the defense.
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {labs.map((lab) => (
                  <ButtonLink key={lab.id} to={`/labs/${lab.id}`} variant="primary" size="sm">
                    {lab.title}
                  </ButtonLink>
                ))}
              </div>
            </div>
          )}

          <hr className="border-line my-8" />

          <Markdown>{lesson.body}</Markdown>

          {lesson.quiz.length > 0 && <LessonQuiz topicId={lesson.topicId} quiz={lesson.quiz} />}

          <section className="mt-10" aria-label="Sources">
            <h2 className="text-fg mb-3 flex items-center gap-2 text-lg font-semibold">
              <Link2 className="text-fg-subtle size-4" aria-hidden /> Sources
            </h2>
            <ul className="space-y-2 text-sm">
              {lesson.sources.map((source) => (
                <li key={source.url} className="text-fg-muted">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-text hover:underline"
                  >
                    {source.title}
                  </a>
                  {source.publisher && (
                    <span className="text-fg-subtle"> · {source.publisher}</span>
                  )}
                  {source.license && <span className="text-fg-subtle"> · {source.license}</span>}
                </li>
              ))}
            </ul>
            <p className="text-fg-subtle mt-3 text-xs leading-relaxed">
              This lesson is original explanation written from the sources above. Technical terms
              and figures are the author’s own. See the About page for licensing.
            </p>
          </section>

          <div className="border-line mt-8 flex items-center justify-between gap-4 border-t pt-6">
            <CompleteButton topicId={lesson.topicId} />
            <div className="flex gap-2">
              {prev && (
                <ButtonLink to={`/learn/${prev.id.toLowerCase()}`} variant="ghost" size="sm">
                  <ArrowLeft className="size-4" aria-hidden /> {prev.id}
                </ButtonLink>
              )}
              {next && (
                <ButtonLink to={`/learn/${next.id.toLowerCase()}`} variant="ghost" size="sm">
                  {next.id} <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              )}
            </div>
          </div>
        </article>

        <aside className="mt-10 hidden lg:sticky lg:top-20 lg:mt-0 lg:block lg:self-start">
          <TableOfContents lesson={lesson} />
        </aside>
      </div>
    </PageContainer>
  );
}
