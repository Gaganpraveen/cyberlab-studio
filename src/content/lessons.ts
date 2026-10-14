import { getTopic } from './catalog';
import {
  type LessonDetail,
  lessonDetailSchema,
  type LessonHeading,
  lessonIndexSchema,
  type LessonMeta,
} from './schema';

/**
 * Lesson metadata is bundled with the app (it drives the topic map, search
 * and progress); each lesson's body, objectives, sources and quiz are a
 * separate chunk, loaded when the lesson is opened. See
 * scripts/vite-plugin-content.ts.
 */

interface RawLessonMeta {
  data: unknown;
  headings: LessonHeading[];
  words: number;
}

const metaModules = import.meta.glob<RawLessonMeta>('/content/lessons/*.md', {
  query: '?meta',
  import: 'default',
  eager: true,
});

const detailModules = import.meta.glob<unknown>('/content/lessons/*.md', {
  query: '?detail',
  import: 'default',
});

export interface ContentIssue {
  file: string;
  message: string;
}

function describeIssues(issues: Array<{ path: PropertyKey[]; message: string }>): string {
  return issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
}

/** Validate one lesson's metadata. Throws with a readable message when it is invalid. */
export function toLessonMeta(file: string, raw: RawLessonMeta): LessonMeta {
  const result = lessonIndexSchema.safeParse(raw.data);
  if (!result.success) {
    throw new Error(
      `Invalid lesson frontmatter in ${file}: ${describeIssues(result.error.issues)}`,
    );
  }
  if (!getTopic(result.data.topicId)) {
    throw new Error(`Lesson ${file} refers to unknown topic ${result.data.topicId}`);
  }
  return { ...result.data, headings: raw.headings, words: raw.words, file };
}

function loadAll(): { lessons: LessonMeta[]; issues: ContentIssue[] } {
  const lessons: LessonMeta[] = [];
  const issues: ContentIssue[] = [];
  for (const [file, raw] of Object.entries(metaModules)) {
    try {
      lessons.push(toLessonMeta(file, raw));
    } catch (error) {
      issues.push({ file, message: (error as Error).message });
    }
  }
  for (const issue of issues) console.error(issue.message);
  lessons.sort((a, b) => a.topicId.localeCompare(b.topicId));
  return { lessons, issues };
}

const loaded = loadAll();

export const LESSONS: LessonMeta[] = loaded.lessons;
export const LESSON_ISSUES: ContentIssue[] = loaded.issues;

const byTopic = new Map(LESSONS.map((lesson) => [lesson.topicId, lesson]));

export function getLesson(topicId: string): LessonMeta | undefined {
  return byTopic.get(topicId.toUpperCase());
}

export function hasLesson(topicId: string): boolean {
  return byTopic.has(topicId.toUpperCase());
}

/** Validate the part of a lesson that loads when it is opened. Throws when invalid. */
export function toLessonDetail(file: string, raw: unknown): LessonDetail {
  const value = (raw ?? {}) as { body?: unknown };
  const result = lessonDetailSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid lesson frontmatter in ${file}: ${describeIssues(result.error.issues)}`,
    );
  }
  return { ...result.data, body: typeof value.body === 'string' ? value.body : '' };
}

/** Load a lesson's body, objectives, sources and quiz (a separate chunk). */
export async function loadLessonDetail(topicId: string): Promise<LessonDetail | undefined> {
  const lesson = getLesson(topicId);
  const load = lesson ? detailModules[lesson.file] : undefined;
  return load ? toLessonDetail(lesson!.file, await load()) : undefined;
}
