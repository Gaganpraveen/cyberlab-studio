import type { LucideIcon } from 'lucide-react';
import type { ComponentType, LazyExoticComponent } from 'react';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Honest execution labels (spec: every demonstration identifies itself).
 * - `real`: the attack and defense genuinely execute (e.g. real SQLite in WebAssembly).
 * - `simulation`: a deterministic model; numbers are simulated, not measured.
 */
export type ExecutionMode = 'real' | 'simulation';

export interface ChallengeDefinition {
  /** Globally unique, kebab-case, prefixed with the lab id: "sqli-login-bypass". */
  id: string;
  labId: string;
  title: string;
  difficulty: Difficulty;
  points: number;
  /** Markdown task statement shown to the learner. */
  prompt: string;
  /** Progressive hints, revealed one at a time (usage is recorded). */
  hints: string[];
  /**
   * How completion is verified:
   * - `flag`: the learner submits a CTF{...} string found by doing the attack.
   * - `answer`: the learner submits a short answer (normalized before checking).
   * - `task`: the lab itself verifies the work (e.g. all tests pass) and marks it solved.
   */
  kind: 'flag' | 'answer' | 'task';
  /**
   * For `flag` and `answer`: SHA-256 hex digests of accepted answers after
   * normalization (see `normalizeAnswer`). Hashing keeps answers out of plain
   * sight in the bundle; it is a convenience, not a secure exam control.
   */
  acceptedHashes?: string[];
  /** Markdown worked solution, revealed on request (recorded as support). */
  solution: string;
  /** Catalog topics this challenge assesses. */
  topicIds: string[];
}

export interface LabDefinition {
  /** kebab-case id used in the URL: /labs/<id>. */
  id: string;
  title: string;
  /** One sentence shown on cards. */
  tagline: string;
  /** Longer description for the lab index (plain text). */
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  mode: ExecutionMode;
  /** What actually runs, e.g. "SQLite 3 compiled to WebAssembly". */
  engine: string;
  topicIds: string[];
  icon: LucideIcon;
  /** Learning objectives (plain text). */
  objectives: string[];
  /** Lazily loaded workspace so each lab is its own code-split chunk. */
  component: LazyExoticComponent<ComponentType>;
  challenges: ChallengeDefinition[];
}
