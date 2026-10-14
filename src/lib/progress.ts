import { z } from 'zod';

import { createPersistentStore, useStore } from './persistentStore';

/**
 * Learner progress, stored only in this browser (V1 has no accounts).
 *
 * Everything goes through the functions in this module so that V2 can swap the
 * persistence layer (server sync with revision numbers) without touching UI.
 */

const lessonSchema = z.object({
  viewedAt: z.string().optional(),
  completedAt: z.string().optional(),
  quiz: z
    .object({ correct: z.number().int().min(0), total: z.number().int().min(0), at: z.string() })
    .optional(),
});

const challengeSchema = z.object({
  attempts: z.number().int().min(0).default(0),
  solvedAt: z.string().optional(),
  hintsUsed: z.number().int().min(0).default(0),
  solutionRevealed: z.boolean().default(false),
});

const labSchema = z.object({
  openedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  state: z.unknown().optional(),
});

const noteSchema = z.object({ text: z.string(), updatedAt: z.string() });

export const progressSchema = z.object({
  version: z.literal(1),
  createdAt: z.string(),
  lessons: z.record(z.string(), lessonSchema).default({}),
  challenges: z.record(z.string(), challengeSchema).default({}),
  labs: z.record(z.string(), labSchema).default({}),
  notes: z.record(z.string(), noteSchema).default({}),
});

export type ProgressData = z.infer<typeof progressSchema>;
export type LessonProgress = z.infer<typeof lessonSchema>;
export type ChallengeProgress = z.infer<typeof challengeSchema>;
export type LabProgress = z.infer<typeof labSchema>;

const now = () => new Date().toISOString();

export function emptyProgress(): ProgressData {
  return { version: 1, createdAt: now(), lessons: {}, challenges: {}, labs: {}, notes: {} };
}

function normalize(raw: unknown): ProgressData {
  const parsed = progressSchema.safeParse(raw);
  return parsed.success ? parsed.data : emptyProgress();
}

export const progressStore = createPersistentStore<ProgressData>(
  'progress:v1',
  emptyProgress(),
  normalize,
);

export function useProgress(): ProgressData {
  return useStore(progressStore);
}

function update(mutator: (draft: ProgressData) => void): void {
  progressStore.set((prev) => {
    const draft: ProgressData = {
      ...prev,
      lessons: { ...prev.lessons },
      challenges: { ...prev.challenges },
      labs: { ...prev.labs },
      notes: { ...prev.notes },
    };
    mutator(draft);
    return draft;
  });
}

// Lessons ------------------------------------------------------------------

export function markLessonViewed(topicId: string): void {
  if (progressStore.get().lessons[topicId]?.viewedAt) return;
  update((d) => {
    d.lessons[topicId] = { ...d.lessons[topicId], viewedAt: now() };
  });
}

export function setLessonCompleted(topicId: string, completed: boolean): void {
  update((d) => {
    const current = d.lessons[topicId] ?? {};
    d.lessons[topicId] = completed
      ? { ...current, viewedAt: current.viewedAt ?? now(), completedAt: now() }
      : { ...current, completedAt: undefined };
  });
}

export function recordQuiz(topicId: string, correct: number, total: number): void {
  update((d) => {
    d.lessons[topicId] = { ...d.lessons[topicId], quiz: { correct, total, at: now() } };
  });
}

// Challenges ---------------------------------------------------------------

export function getChallengeProgress(id: string): ChallengeProgress {
  return (
    progressStore.get().challenges[id] ?? { attempts: 0, hintsUsed: 0, solutionRevealed: false }
  );
}

/** Record one submission. Returns the updated record. */
export function recordChallengeAttempt(id: string, solved: boolean): ChallengeProgress {
  update((d) => {
    const current = d.challenges[id] ?? { attempts: 0, hintsUsed: 0, solutionRevealed: false };
    d.challenges[id] = {
      ...current,
      attempts: current.attempts + 1,
      solvedAt: current.solvedAt ?? (solved ? now() : undefined),
    };
  });
  return getChallengeProgress(id);
}

/** Mark a lab-verified task as solved (for challenges the lab itself checks). */
export function markChallengeSolved(id: string): void {
  if (progressStore.get().challenges[id]?.solvedAt) return;
  recordChallengeAttempt(id, true);
}

export function recordHintUsed(id: string, hintIndex: number): void {
  update((d) => {
    const current = d.challenges[id] ?? { attempts: 0, hintsUsed: 0, solutionRevealed: false };
    d.challenges[id] = { ...current, hintsUsed: Math.max(current.hintsUsed, hintIndex + 1) };
  });
}

export function recordSolutionRevealed(id: string): void {
  update((d) => {
    const current = d.challenges[id] ?? { attempts: 0, hintsUsed: 0, solutionRevealed: false };
    d.challenges[id] = { ...current, solutionRevealed: true };
  });
}

export type CompletionLevel = 'not-started' | 'attempted' | 'with-support' | 'independent';

/** Completion wording follows the spec: support used is recorded, not hidden. */
export function challengeCompletion(record: ChallengeProgress | undefined): CompletionLevel {
  if (!record || (record.attempts === 0 && !record.solvedAt)) return 'not-started';
  if (!record.solvedAt) return 'attempted';
  return record.hintsUsed > 0 || record.solutionRevealed ? 'with-support' : 'independent';
}

// Labs ---------------------------------------------------------------------

export function markLabOpened(labId: string): void {
  update((d) => {
    d.labs[labId] = { ...d.labs[labId], openedAt: now() };
  });
}

export function saveLabState(labId: string, state: unknown): void {
  update((d) => {
    d.labs[labId] = { ...d.labs[labId], state, updatedAt: now() };
  });
}

export function loadLabState<T>(labId: string): T | undefined {
  return progressStore.get().labs[labId]?.state as T | undefined;
}

export function clearLabState(labId: string): void {
  update((d) => {
    const current = d.labs[labId];
    if (current) d.labs[labId] = { openedAt: current.openedAt };
  });
}

// Notes --------------------------------------------------------------------

export function saveNote(key: string, text: string): void {
  update((d) => {
    if (text.trim() === '') delete d.notes[key];
    else d.notes[key] = { text, updatedAt: now() };
  });
}

// Backup -------------------------------------------------------------------

const EXPORT_FORMAT = 'cyberlab-studio-progress';

export function exportProgress(): string {
  return JSON.stringify(
    { format: EXPORT_FORMAT, exportedAt: now(), data: progressStore.get() },
    null,
    2,
  );
}

export type ImportResult = { ok: true } | { ok: false; error: string };

/** Validate an exported file and replace current progress only if it is valid. */
export function importProgress(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  const envelope = parsed as { format?: unknown; data?: unknown };
  if (!envelope || envelope.format !== EXPORT_FORMAT) {
    return { ok: false, error: 'That file is not a CyberLab Studio progress export.' };
  }
  const result = progressSchema.safeParse(envelope.data);
  if (!result.success) {
    return { ok: false, error: 'The progress data in that file is damaged or from an unknown version.' };
  }
  progressStore.set(result.data);
  return { ok: true };
}

export function resetProgress(): void {
  progressStore.set(emptyProgress());
}
