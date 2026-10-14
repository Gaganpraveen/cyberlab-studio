import { slugify } from '@/lib/slug';

import { getTopic } from './catalog';
import { parseFrontmatter } from './frontmatter';
import { type Lesson, lessonFrontmatterSchema } from './schema';

const files = import.meta.glob<string>('/content/lessons/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export interface ContentIssue {
  file: string;
  message: string;
}

/** Parse one lesson file. Throws with a readable message when it is invalid. */
export function parseLesson(file: string, source: string): Lesson {
  const { data, body } = parseFrontmatter(source);
  const result = lessonFrontmatterSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid lesson frontmatter in ${file}: ${details}`);
  }
  if (!getTopic(result.data.topicId)) {
    throw new Error(`Lesson ${file} refers to unknown topic ${result.data.topicId}`);
  }
  const headings = [...body.matchAll(/^##\s+(.+?)\s*#*\s*$/gm)].map((m) => {
    const text = (m[1] ?? '').trim();
    return { id: slugify(text), text };
  });
  return { ...result.data, body, headings, file };
}

function loadAll(): { lessons: Lesson[]; issues: ContentIssue[] } {
  const lessons: Lesson[] = [];
  const issues: ContentIssue[] = [];
  for (const [file, source] of Object.entries(files)) {
    try {
      lessons.push(parseLesson(file, source));
    } catch (error) {
      issues.push({ file, message: (error as Error).message });
    }
  }
  if (issues.length > 0) {
    for (const issue of issues) console.error(issue.message);
  }
  lessons.sort((a, b) => a.topicId.localeCompare(b.topicId));
  return { lessons, issues };
}

const loaded = loadAll();

export const LESSONS: Lesson[] = loaded.lessons;
export const LESSON_ISSUES: ContentIssue[] = loaded.issues;

const byTopic = new Map(LESSONS.map((lesson) => [lesson.topicId, lesson]));

export function getLesson(topicId: string): Lesson | undefined {
  return byTopic.get(topicId.toUpperCase());
}

export function hasLesson(topicId: string): boolean {
  return byTopic.has(topicId.toUpperCase());
}

/** Lessons that list this lab, in catalog order. */
export function lessonsForLab(labId: string): Lesson[] {
  return LESSONS.filter((lesson) => lesson.labs.includes(labId));
}
