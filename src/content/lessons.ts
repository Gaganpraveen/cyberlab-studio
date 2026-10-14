import { getTopic } from './catalog';
import { type LessonHeading, type LessonMeta, lessonFrontmatterSchema } from './schema';

/**
 * Lesson metadata is bundled with the app (it drives the topic map, search
 * and progress); each lesson's body is a separate chunk, loaded when the
 * lesson is opened. See scripts/vite-plugin-content.ts.
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

const bodyModules = import.meta.glob<string>('/content/lessons/*.md', {
  query: '?body',
  import: 'default',
});

export interface ContentIssue {
  file: string;
  message: string;
}

/** Validate one lesson's metadata. Throws with a readable message when it is invalid. */
export function toLessonMeta(file: string, raw: RawLessonMeta): LessonMeta {
  const result = lessonFrontmatterSchema.safeParse(raw.data);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid lesson frontmatter in ${file}: ${details}`);
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

/** Load a lesson's Markdown body (a separate chunk). */
export async function loadLessonBody(topicId: string): Promise<string | undefined> {
  const lesson = getLesson(topicId);
  const load = lesson ? bodyModules[lesson.file] : undefined;
  return load ? load() : undefined;
}

/** Lessons that list this lab, in catalog order. */
export function lessonsForLab(labId: string): LessonMeta[] {
  return LESSONS.filter((lesson) => lesson.labs.includes(labId));
}
