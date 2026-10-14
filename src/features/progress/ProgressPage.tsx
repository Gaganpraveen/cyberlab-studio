import {
  BookOpen,
  Check,
  Copy,
  Download,
  RotateCcw,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { PageContainer } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Badge, Card, EmptyState, PageHeader, ProgressBar } from '@/components/ui/primitives';
import { DOMAINS } from '@/content/catalog';
import { getLesson, LESSONS } from '@/content/lessons';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CHALLENGES } from '@/labs/registry';
import {
  challengeCompletion,
  exportProgress,
  importProgress,
  resetProgress,
  useProgress,
} from '@/lib/progress';

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="p-5">
      <div className="text-fg-subtle text-xs font-semibold tracking-[0.1em] uppercase">{label}</div>
      <div className="text-fg mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      {detail && <div className="text-fg-muted mt-1 text-sm">{detail}</div>}
    </Card>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function DataControls() {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyberlab-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = () => {
    navigator.clipboard
      ?.writeText(exportProgress())
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => toast.error('Your browser blocked copying. Use Download instead.'));
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = importProgress(await file.text());
    if (result.ok) toast.success('Progress imported.');
    else toast.error(result.error);
  };

  return (
    <section className="mt-12" aria-labelledby="your-data">
      <h2 id="your-data" className="text-fg text-lg font-semibold">
        Your data
      </h2>
      <p className="text-fg-muted mt-1 max-w-2xl text-sm leading-relaxed">
        Progress is saved only in this browser. Nothing is sent to a server. Export a backup to move
        it to another computer or to hand in as evidence of completed work.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon={<Download className="size-4" aria-hidden />}
          onClick={download}
        >
          Download backup
        </Button>
        <Button
          variant="secondary"
          icon={
            copied ? (
              <Check className="text-success size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )
          }
          onClick={copy}
        >
          {copied ? 'Copied' : 'Copy backup'}
        </Button>
        <Button
          variant="secondary"
          icon={<Upload className="size-4" aria-hidden />}
          onClick={() => fileRef.current?.click()}
        >
          Import backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={onFile}
        />
        {confirming ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-fg-muted text-sm">Erase all progress in this browser?</span>
            <Button
              variant="danger"
              onClick={() => {
                resetProgress();
                setConfirming(false);
                toast.success('Progress erased.');
              }}
            >
              Erase
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            icon={<RotateCcw className="size-4" aria-hidden />}
            onClick={() => setConfirming(true)}
          >
            Reset progress
          </Button>
        )}
      </div>
    </section>
  );
}

export default function ProgressPage() {
  useDocumentTitle('Progress');
  const progress = useProgress();

  const lessonEntries = Object.entries(progress.lessons).filter(([id]) => getLesson(id));
  const completed = lessonEntries.filter(([, l]) => l.completedAt);
  const quizzes = lessonEntries.filter(([, l]) => l.quiz && l.quiz.total > 0);
  const quizCorrect = quizzes.reduce((n, [, l]) => n + (l.quiz?.correct ?? 0), 0);
  const quizTotal = quizzes.reduce((n, [, l]) => n + (l.quiz?.total ?? 0), 0);
  const solved = CHALLENGES.filter((c) => progress.challenges[c.id]?.solvedAt);
  const independent = solved.filter(
    (c) => challengeCompletion(progress.challenges[c.id]) === 'independent',
  );
  const recent = [...lessonEntries]
    .filter(([, l]) => l.viewedAt)
    .sort((a, b) => (b[1].viewedAt ?? '').localeCompare(a[1].viewedAt ?? ''))
    .slice(0, 6);

  const empty = lessonEntries.length === 0 && Object.keys(progress.challenges).length === 0;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Progress"
        title="Your progress"
        description="What you have read, checked and solved, saved in this browser."
      />

      {empty ? (
        <div className="mt-8">
          <EmptyState
            icon={TrendingUp}
            title="Nothing here yet"
            action={
              <Link to="/learn" className="text-accent-text text-sm font-medium hover:underline">
                Start with the topic map
              </Link>
            }
          >
            Open a lesson, answer its quiz or solve a lab challenge, and your progress will show up
            here.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat
              label="Lessons completed"
              value={`${completed.length}`}
              detail={`of ${LESSONS.length} lessons ready`}
            />
            <Stat
              label="Quiz accuracy"
              value={quizTotal ? `${Math.round((quizCorrect / quizTotal) * 100)}%` : '–'}
              detail={
                quizTotal
                  ? `${quizCorrect} of ${quizTotal} answers across ${quizzes.length} quizzes`
                  : 'No quizzes answered yet'
              }
            />
            <Stat
              label="Challenges solved"
              value={`${solved.length}`}
              detail={`of ${CHALLENGES.length}; ${independent.length} without hints`}
            />
          </div>

          <section className="mt-12" aria-labelledby="by-area">
            <h2 id="by-area" className="text-fg mb-4 text-lg font-semibold">
              By area
            </h2>
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {DOMAINS.map((domain) => {
                const ready = LESSONS.filter((l) => l.topicId.startsWith(`${domain.id}-`));
                const done = ready.filter((l) => progress.lessons[l.topicId]?.completedAt);
                return (
                  <div key={domain.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-fg-muted truncate">{domain.title}</span>
                      <span className="text-fg-subtle shrink-0 tabular-nums">
                        {done.length} / {ready.length}
                      </span>
                    </div>
                    <ProgressBar
                      value={done.length}
                      max={Math.max(ready.length, 1)}
                      label={`${domain.title} lessons completed`}
                      tone={ready.length > 0 && done.length === ready.length ? 'success' : 'accent'}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {recent.length > 0 && (
            <section className="mt-12" aria-labelledby="recent">
              <h2 id="recent" className="text-fg mb-3 text-lg font-semibold">
                Recently opened
              </h2>
              <ul className="border-line bg-surface divide-line divide-y rounded-xl border">
                {recent.map(([id, entry]) => {
                  const lesson = getLesson(id)!;
                  return (
                    <li key={id}>
                      <Link
                        to={`/learn/${id.toLowerCase()}`}
                        className="hover:bg-surface-2 flex items-center gap-3 px-4 py-3 transition-colors"
                      >
                        <BookOpen className="text-fg-subtle size-4 shrink-0" aria-hidden />
                        <span className="text-fg min-w-0 flex-1 truncate text-sm">
                          {lesson.title}
                        </span>
                        {entry.quiz && (
                          <Badge tone="neutral">
                            Quiz {entry.quiz.correct}/{entry.quiz.total}
                          </Badge>
                        )}
                        {entry.completedAt ? (
                          <Badge tone="success">Completed</Badge>
                        ) : (
                          <span className="text-fg-subtle text-xs">
                            {formatDate(entry.viewedAt)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {solved.length > 0 && (
            <section className="mt-12" aria-labelledby="solved">
              <h2 id="solved" className="text-fg mb-3 text-lg font-semibold">
                Solved challenges
              </h2>
              <ul className="space-y-2">
                {solved.map((c) => {
                  const level = challengeCompletion(progress.challenges[c.id]);
                  return (
                    <li key={c.id} className="flex items-center gap-3 text-sm">
                      <Target className="text-fg-subtle size-4 shrink-0" aria-hidden />
                      <span className="text-fg">{c.title}</span>
                      <Badge tone={level === 'independent' ? 'success' : 'neutral'}>
                        {level === 'independent' ? 'Independent' : 'With support'}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      <DataControls />
    </PageContainer>
  );
}
