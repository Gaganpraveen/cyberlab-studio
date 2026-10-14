import { Activity, Cpu, PencilLine, ShieldCheck } from 'lucide-react';

import type { Level, ReviewStatus } from '@/content/schema';
import type { Difficulty, ExecutionMode } from '@/labs/types';

import { Badge } from './primitives';

const difficultyTone = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
} as const;

const difficultyLabel: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <Badge tone={difficultyTone[difficulty]}>{difficultyLabel[difficulty]}</Badge>;
}

const levelLabel: Record<Level, string> = {
  intro: 'Intro',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function LevelBadge({ level }: { level: Level }) {
  return <Badge tone="neutral">{levelLabel[level]}</Badge>;
}

/** Honest execution label required on every lab (spec SEC "Honest execution labels"). */
export function ExecutionBadge({ mode }: { mode: ExecutionMode }) {
  return mode === 'real' ? (
    <Badge tone="info" icon={<Cpu className="size-3" aria-hidden />}>
      Real execution in your browser
    </Badge>
  ) : (
    <Badge tone="accent" icon={<Activity className="size-3" aria-hidden />}>
      Deterministic simulation
    </Badge>
  );
}

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  return status === 'reviewed' ? (
    <Badge tone="success" icon={<ShieldCheck className="size-3" aria-hidden />}>
      Instructor reviewed
    </Badge>
  ) : (
    <Badge tone="warning" icon={<PencilLine className="size-3" aria-hidden />}>
      Draft: pending instructor review
    </Badge>
  );
}
