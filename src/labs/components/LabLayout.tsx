import { ArrowLeft, BookOpen, Clock, NotebookPen, RotateCcw, Target } from 'lucide-react';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { DifficultyBadge, ExecutionBadge } from '@/components/ui/badges';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/radix';
import { getTopic } from '@/content/catalog';
import { hasLesson } from '@/content/lessons';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { markLabOpened, saveNote, useProgress } from '@/lib/progress';

import type { LabDefinition } from '../types';
import { ChallengeCard } from './ChallengeCard';

function ResizeHandle({ direction }: { direction: 'horizontal' | 'vertical' }) {
  return (
    <Separator
      className={cn(
        'group bg-line hover:bg-accent/60 data-[separator=active]:bg-accent relative shrink-0 transition-colors',
        direction === 'horizontal' ? 'w-px' : 'h-px',
      )}
    >
      <span
        className={cn(
          'absolute',
          direction === 'horizontal'
            ? 'inset-y-0 -right-1.5 -left-1.5'
            : 'inset-x-0 -top-1.5 -bottom-1.5',
        )}
      />
    </Separator>
  );
}

function LabNotes({ labId }: { labId: string }) {
  const progress = useProgress();
  const key = `lab:${labId}`;
  const [text, setText] = useState(progress.notes[key]?.text ?? '');
  const id = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => saveNote(key, text), 400);
    return () => window.clearTimeout(timer);
  }, [key, text]);

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <label htmlFor={id} className="text-fg-muted text-sm">
        Your lab notebook. Record a prediction, what you observed, and why. Saved in this browser.
      </label>
      <textarea
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Prediction:\nObservation:\nExplanation:\nWhat would make the defense better?'}
        className="bg-surface-2 border-line-strong text-fg placeholder:text-fg-subtle focus:border-focus min-h-60 flex-1 resize-none rounded-lg border p-3 font-mono text-sm leading-relaxed focus:outline-none"
      />
    </div>
  );
}

export interface LabLayoutProps {
  lab: LabDefinition;
  /** Briefing and step-by-step instructions (left panel, "Guide" tab). */
  guide: ReactNode;
  /** The live lab: target, editor, visualization (main panel). */
  workspace: ReactNode;
  /** Optional evidence panel under the workspace (usually <EvidenceLog />). */
  evidence?: ReactNode;
  /** Restore the lab to its clean starting state. Asked for confirmation first. */
  onReset?: () => void;
  /** Extra controls for the header (e.g. a mode switch). */
  toolbar?: ReactNode;
}

/**
 * Shared lab workspace: guide / challenges / notes on the left, the live lab
 * on the right, evidence underneath. Panels resize on desktop and stack on
 * small screens.
 */
export function LabLayout({ lab, guide, workspace, evidence, onReset, toolbar }: LabLayoutProps) {
  useDocumentTitle(lab.title);
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const progress = useProgress();
  const solved = lab.challenges.filter((c) => progress.challenges[c.id]?.solvedAt).length;

  useEffect(() => {
    markLabOpened(lab.id);
  }, [lab.id]);

  const relatedLessons = lab.topicIds.filter((id) => hasLesson(id));

  const sidePanel = (
    <Tabs defaultValue="guide" className="flex h-full min-h-0 flex-col">
      <TabsList className="shrink-0">
        <TabsTrigger value="guide">
          <BookOpen className="size-3.5" aria-hidden /> Guide
        </TabsTrigger>
        <TabsTrigger value="challenges">
          <Target className="size-3.5" aria-hidden /> Challenges
          <span className="text-fg-subtle tabular-nums">
            {solved}/{lab.challenges.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="notes">
          <NotebookPen className="size-3.5" aria-hidden /> Notes
        </TabsTrigger>
      </TabsList>
      <TabsContent value="guide" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 p-5">
          {guide}
          {relatedLessons.length > 0 && (
            <div className="border-line border-t pt-4">
              <div className="text-fg-subtle mb-2 text-xs font-semibold tracking-[0.1em] uppercase">
                Read the lesson
              </div>
              <ul className="space-y-1">
                {relatedLessons.map((id) => (
                  <li key={id}>
                    <Link
                      to={`/learn/${id.toLowerCase()}`}
                      className="text-accent-text text-sm hover:underline"
                    >
                      {id} · {getTopic(id)?.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </TabsContent>
      <TabsContent value="challenges" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 p-4">
          {lab.challenges.map((challenge, i) => (
            <ChallengeCard key={challenge.id} challenge={challenge} defaultOpen={i === 0} />
          ))}
        </div>
      </TabsContent>
      <TabsContent value="notes" className="min-h-0 flex-1">
        <LabNotes labId={lab.id} />
      </TabsContent>
    </Tabs>
  );

  const header = (
    <header className="border-line bg-canvas/80 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 backdrop-blur lg:px-5">
      <Link
        to="/labs"
        className="text-fg-subtle hover:text-fg inline-flex items-center gap-1 text-sm"
        aria-label="Back to all labs"
      >
        <ArrowLeft className="size-4" aria-hidden />
        <span className="hidden sm:inline">Labs</span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
        <h1 className="text-fg truncate text-lg font-semibold tracking-tight">{lab.title}</h1>
        <ExecutionBadge mode={lab.mode} />
        <DifficultyBadge difficulty={lab.difficulty} />
        <span className="text-fg-subtle inline-flex items-center gap-1 text-xs">
          <Clock className="size-3.5" aria-hidden /> {lab.estimatedMinutes} min
        </span>
      </div>
      <div className="flex items-center gap-2">
        {toolbar}
        {onReset && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw className="size-3.5" aria-hidden />}
              >
                Reset lab
              </Button>
            </DialogTrigger>
            <DialogContent
              title="Reset this lab?"
              description="This restores the clean starting state. Your notes and challenge progress are kept."
            >
              <div className="mt-6 flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="primary" onClick={onReset}>
                    Reset lab
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </header>
  );

  if (!wide) {
    return (
      <div className="flex flex-col">
        {header}
        <div className="border-line border-b">{workspace}</div>
        {evidence && <div className="border-line h-72 border-b">{evidence}</div>}
        <div className="min-h-[28rem]">{sidePanel}</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col">
      {header}
      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel
          id="side"
          defaultSize="32"
          minSize="22"
          maxSize="50"
          className="bg-surface/40 min-h-0"
        >
          {sidePanel}
        </Panel>
        <ResizeHandle direction="horizontal" />
        <Panel id="main" minSize="40" className="min-h-0">
          {evidence ? (
            <Group orientation="vertical" className="h-full">
              <Panel id="workspace" defaultSize="70" minSize="35" className="min-h-0">
                <div className="h-full overflow-auto">{workspace}</div>
              </Panel>
              <ResizeHandle direction="vertical" />
              <Panel id="evidence" defaultSize="30" minSize="12" className="bg-surface/40 min-h-0">
                {evidence}
              </Panel>
            </Group>
          ) : (
            <div className="h-full overflow-auto">{workspace}</div>
          )}
        </Panel>
      </Group>
    </div>
  );
}

/** A numbered step list for lab guides. */
export function LabSteps({ steps }: { steps: Array<{ title: string; body: ReactNode }> }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-3">
          <span className="bg-accent-soft text-accent-text flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
            {i + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="text-fg text-sm font-semibold">{step.title}</div>
            <div className="text-fg-muted text-sm leading-relaxed">{step.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
