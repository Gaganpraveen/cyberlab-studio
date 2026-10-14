import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Check,
  ChevronRight,
  Clock,
  FilePlus2,
  FileText,
  FlaskConical,
  Library,
  Link2,
  PencilLine,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { Markdown } from '@/components/markdown/Markdown';
import { Button, ButtonLink } from '@/components/ui/Button';
import { LevelBadge, ReviewBadge } from '@/components/ui/badges';
import { Badge, Callout, EmptyState } from '@/components/ui/primitives';
import { attacksForTopic } from '@/content/attacks';
import { getTopic, TOPICS, type TopicRecord } from '@/content/catalog';
import { getTerm, termsForTopic } from '@/content/glossary';
import { getLesson, loadLessonBody } from '@/content/lessons';
import { readingsForTopic } from '@/content/library';
import type { GlossaryTerm, LessonHeading, LessonMeta } from '@/content/schema';
import { ReadingList } from '@/features/library/ReadingList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { labsForTopic } from '@/labs/registry';
import { cn } from '@/lib/cn';
import { markLessonViewed, setLessonCompleted, useProgress } from '@/lib/progress';
import { resolveReducedMotion, settingsStore } from '@/lib/settings';
import { editOnGitHubUrl, SITE } from '@/lib/site';

import { LessonQuiz } from './LessonQuiz';

/** Scroll to a heading without touching the URL (the hash belongs to the router). */
function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = resolveReducedMotion(settingsStore.get().motion);
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/** A thin bar under the top bar that fills as you read. Updates without re-rendering. */
function ReadingProgress({ target }: { target: RefObject<HTMLElement | null> }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = target.current;
      const bar = barRef.current;
      if (!el || !bar) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const progress = total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total));
      bar.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [target]);
  return (
    <div className="pointer-events-none sticky top-14 z-20 h-0.5 w-full" aria-hidden>
      <div
        ref={barRef}
        className="bg-accent h-full origin-left"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}

/** Highlights the section currently in view. */
function useActiveHeading(headings: LessonHeading[], ready: boolean): string | undefined {
  const [active, setActive] = useState<string>();
  useEffect(() => {
    if (!ready) return;
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string | undefined;
      for (const el of elements) {
        if (el.getBoundingClientRect().top <= 120) current = el.id;
        else break;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headings, ready]);
  return active;
}

function TableOfContents({ headings, active }: { headings: LessonHeading[]; active?: string }) {
  if (headings.length < 3) return null;
  return (
    <nav aria-label="On this page" className="space-y-2">
      <div className="text-fg-subtle text-xs font-semibold tracking-[0.1em] uppercase">
        On this page
      </div>
      <ul className="border-line space-y-0.5 border-l text-sm">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToHeading(h.id);
              }}
              aria-current={active === h.id ? 'location' : undefined}
              className={cn(
                '-ml-px block border-l-2 py-1 pl-3 leading-snug transition-colors',
                active === h.id
                  ? 'border-accent text-fg font-medium'
                  : 'text-fg-muted hover:text-fg hover:border-line-strong border-transparent',
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Breadcrumbs({ topic }: { topic: TopicRecord }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="text-fg-subtle flex flex-wrap items-center gap-1 text-sm">
        <li>
          <Link to="/learn" className="hover:text-fg transition-colors">
            Learn
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="size-3.5" />
        </li>
        <li>
          <Link to={`/learn?domain=${topic.domainId}`} className="hover:text-fg transition-colors">
            {topic.domainTitle}
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="size-3.5" />
        </li>
        <li aria-current="page" className="text-fg-muted font-mono">
          {topic.id}
        </li>
      </ol>
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
          return (
            <li key={id}>
              <Link to={`/learn/${id.toLowerCase()}`} className="text-accent-text hover:underline">
                {topic?.title ?? id}
              </Link>
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

function Section({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="mt-12" aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-fg flex items-center gap-2 text-lg font-semibold">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TermChips({ terms }: { terms: GlossaryTerm[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {terms.map((term) => (
        <li key={term.id}>
          <Link
            to={`/glossary/${term.id}`}
            title={term.short}
            className="border-line bg-surface hover:border-line-strong hover:text-fg text-fg-muted inline-flex rounded-full border px-3 py-1 text-sm transition-colors"
          >
            {term.term}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AttackChips({ topicId }: { topicId: string }) {
  const attacks = attacksForTopic(topicId);
  if (attacks.length === 0) return null;
  return (
    <Section
      title="Attacks covered"
      icon={<ShieldAlert className="text-fg-subtle size-4" aria-hidden />}
      action={
        <Link to="/attacks" className="text-accent-text text-sm hover:underline">
          Attacks A to Z
        </Link>
      }
    >
      <ul className="flex flex-wrap gap-2">
        {attacks.map((attack) => (
          <li key={attack.id}>
            <Link
              to={`/attacks/${attack.id}`}
              title={attack.summary}
              className="border-line bg-surface hover:border-line-strong hover:text-fg text-fg-muted inline-flex rounded-full border px-3 py-1 text-sm transition-colors"
            >
              {attack.name}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Readings({ topicId }: { topicId: string }) {
  const readings = readingsForTopic(topicId);
  if (readings.length === 0) return null;
  return (
    <Section
      title="Read more"
      icon={<Library className="text-fg-subtle size-4" aria-hidden />}
      action={
        <Link to="/library" className="text-accent-text text-sm hover:underline">
          Whole library
        </Link>
      }
    >
      <ReadingList readings={readings.slice(0, 8)} />
    </Section>
  );
}

function PrevNext({ topicId }: { topicId: string }) {
  const index = TOPICS.findIndex((t) => t.id === topicId);
  const prev = index > 0 ? TOPICS[index - 1] : undefined;
  const next = index < TOPICS.length - 1 ? TOPICS[index + 1] : undefined;
  const linkClasses =
    'border-line bg-surface hover:border-line-strong group flex min-w-0 flex-1 flex-col gap-1 rounded-xl border p-4 transition-colors';
  return (
    <nav aria-label="Next and previous topics" className="mt-8 flex flex-col gap-3 sm:flex-row">
      {prev ? (
        <Link to={`/learn/${prev.id.toLowerCase()}`} className={linkClasses}>
          <span className="text-fg-subtle inline-flex items-center gap-1 text-xs">
            <ArrowLeft className="size-3.5" aria-hidden /> Previous · {prev.id}
          </span>
          <span className="text-fg group-hover:text-accent-text truncate text-sm font-medium">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
      {next && (
        <Link to={`/learn/${next.id.toLowerCase()}`} className={cn(linkClasses, 'sm:text-right')}>
          <span className="text-fg-subtle inline-flex items-center gap-1 text-xs sm:justify-end">
            Next · {next.id} <ArrowRight className="size-3.5" aria-hidden />
          </span>
          <span className="text-fg group-hover:text-accent-text truncate text-sm font-medium">
            {next.title}
          </span>
        </Link>
      )}
    </nav>
  );
}

function LabBanner({ topicId }: { topicId: string }) {
  const labs = labsForTopic(topicId);
  if (labs.length === 0) return null;
  return (
    <div className="border-accent/30 bg-accent-soft mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <FlaskConical className="text-accent-text size-5 shrink-0" aria-hidden />
        <div>
          <div className="text-fg text-sm font-semibold">Practice this in the lab</div>
          <div className="text-fg-muted text-xs">
            Labs run entirely in your browser against fictional systems.
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
  );
}

function BodySkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading lesson">
      {[92, 100, 84, 96, 70].map((w, i) => (
        <div
          key={i}
          className="bg-surface-2 h-4 animate-pulse rounded"
          style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
        />
      ))}
      <div className="bg-surface-2 mt-8 h-6 w-1/3 animate-pulse rounded" />
      {[100, 88, 94].map((w, i) => (
        <div
          key={i}
          className="bg-surface-2 h-4 animate-pulse rounded"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

type BodyState =
  | { status: 'loading' }
  | { status: 'ready'; topicId: string; text: string }
  | { status: 'error'; topicId: string };

function useLessonBody(topicId: string | undefined) {
  const [state, setState] = useState<BodyState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!topicId) return;
    let cancelled = false;
    loadLessonBody(topicId).then(
      (text) => !cancelled && setState({ status: 'ready', topicId, text: text ?? '' }),
      () => !cancelled && setState({ status: 'error', topicId }),
    );
    return () => {
      cancelled = true;
    };
  }, [topicId, attempt]);
  const current = state.status !== 'loading' && state.topicId === topicId ? state : undefined;
  return { body: current, retry: () => setAttempt((n) => n + 1) };
}

function LessonView({ topic, lesson }: { topic: TopicRecord; lesson: LessonMeta }) {
  const articleRef = useRef<HTMLElement>(null);
  const { body, retry } = useLessonBody(lesson.topicId);
  const active = useActiveHeading(lesson.headings, body?.status === 'ready');
  const concepts = lesson.concepts.map((id) => getTerm(id)).filter((t): t is GlossaryTerm => !!t);

  useEffect(() => {
    markLessonViewed(lesson.topicId);
  }, [lesson.topicId]);

  const updated = new Date(`${lesson.updated}T12:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <ReadingProgress target={articleRef} />
      <PageContainer width="wide">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
          <article ref={articleRef} className="min-w-0">
            <Breadcrumbs topic={topic} />

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <LevelBadge level={lesson.level} />
              <ReviewBadge status={lesson.status} />
              <span className="text-fg-subtle inline-flex items-center gap-1 text-xs">
                <Clock className="size-3.5" aria-hidden /> {lesson.estimatedMinutes} min
              </span>
              <span className="text-fg-subtle text-xs">Updated {updated}</span>
            </div>

            <h1 className="text-fg max-w-[24ch] text-[2rem] leading-tight font-semibold tracking-tight text-balance md:text-[2.375rem]">
              {lesson.title}
            </h1>
            <p className="text-fg-muted mt-3 max-w-[68ch] text-lg leading-relaxed text-pretty">
              {lesson.summary}
            </p>

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

            <LabBanner topicId={lesson.topicId} />

            <hr className="border-line my-8" />

            {!body && <BodySkeleton />}
            {body?.status === 'error' && (
              <Callout tone="danger" title="This lesson didn’t load">
                <p>Check your connection, then try again.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  icon={<RotateCcw className="size-4" aria-hidden />}
                  onClick={retry}
                >
                  Try again
                </Button>
              </Callout>
            )}
            {body?.status === 'ready' && (
              <div className="animate-fade-in">
                <Markdown>{body.text}</Markdown>
              </div>
            )}

            {lesson.quiz.length > 0 && <LessonQuiz topicId={lesson.topicId} quiz={lesson.quiz} />}

            {concepts.length > 0 && (
              <Section
                title="Key terms"
                icon={<BookMarked className="text-fg-subtle size-4" aria-hidden />}
              >
                <TermChips terms={concepts} />
              </Section>
            )}

            <AttackChips topicId={lesson.topicId} />
            <Readings topicId={lesson.topicId} />

            <Section title="Sources" icon={<Link2 className="text-fg-subtle size-4" aria-hidden />}>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {lesson.sources.map((source) => (
                  <li key={source.url} className="text-fg-muted pl-1">
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
              </ol>
              <p className="text-fg-subtle mt-4 text-xs leading-relaxed">
                {lesson.status === 'draft'
                  ? 'This draft was written with AI assistance from the sources above and is waiting for instructor review. '
                  : 'This lesson was reviewed by an instructor. '}
                Spotted a mistake?{' '}
                <a
                  href={editOnGitHubUrl(lesson.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-text hover:underline"
                >
                  Suggest an edit on GitHub
                </a>
                .
              </p>
            </Section>

            <div className="border-line mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
              <CompleteButton topicId={lesson.topicId} />
              <a
                href={editOnGitHubUrl(lesson.file)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-subtle hover:text-fg inline-flex items-center gap-1.5 text-sm transition-colors"
              >
                <PencilLine className="size-4" aria-hidden /> Edit this lesson
              </a>
            </div>

            <PrevNext topicId={lesson.topicId} />
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <TableOfContents headings={lesson.headings} active={active} />
            </div>
          </aside>
        </div>
      </PageContainer>
    </>
  );
}

function ComingSoon({ topic }: { topic: TopicRecord }) {
  const terms = termsForTopic(topic.id);
  const newFileUrl = `${SITE.repoUrl}/new/${SITE.contentBranch}/content/lessons?filename=${topic.id.toLowerCase()}.md`;
  return (
    <PageContainer width="default">
      <div className="max-w-3xl">
        <Breadcrumbs topic={topic} />
        <div className="space-y-4">
          <Badge tone="warning">Lesson in progress</Badge>
          <h1 className="text-fg text-[2rem] leading-tight font-semibold tracking-tight text-balance">
            {topic.title}
          </h1>
          <p className="text-fg-muted text-lg leading-relaxed text-pretty">
            The full lesson for this topic is being written. Until it is ready, the planned activity
            and the readings below cover it.
          </p>
          <Callout tone="accent" title="Planned activity">
            <p>{topic.activity}</p>
          </Callout>
        </div>

        <LabBanner topicId={topic.id} />

        {terms.length > 0 && (
          <Section
            title="Key terms"
            icon={<BookMarked className="text-fg-subtle size-4" aria-hidden />}
          >
            <TermChips terms={terms} />
          </Section>
        )}

        <AttackChips topicId={topic.id} />
        <Readings topicId={topic.id} />

        <Section
          title="Teaching this topic?"
          icon={<FilePlus2 className="text-fg-subtle size-4" aria-hidden />}
        >
          <p className="text-fg-muted text-sm leading-relaxed">
            Lessons are plain Markdown files, so an instructor can write or adapt one in
            GitHub&rsquo;s editor.{' '}
            <a
              href={newFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-text hover:underline"
            >
              Start this lesson on GitHub
            </a>{' '}
            and follow the{' '}
            <a
              href={`${SITE.repoUrl}/blob/${SITE.contentBranch}/docs/CONTENT_GUIDE.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-text hover:underline"
            >
              content guide
            </a>
            .
          </p>
        </Section>

        <PrevNext topicId={topic.id} />
      </div>
    </PageContainer>
  );
}

export default function TopicPage() {
  const { topicId = '' } = useParams();
  const upper = topicId.toUpperCase();
  const topic = getTopic(upper);
  const lesson = getLesson(upper);
  useDocumentTitle(lesson?.title ?? topic?.title);

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

  return lesson ? (
    <LessonView key={lesson.topicId} topic={topic} lesson={lesson} />
  ) : (
    <ComingSoon key={topic.id} topic={topic} />
  );
}
