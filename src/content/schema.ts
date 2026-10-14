import { z } from 'zod';

/**
 * Content contracts. Lessons, glossary terms and library sources live as
 * plain text files under /content so instructors can edit them without
 * touching application code; these schemas validate them at load time and in
 * the test suite.
 */

export const TOPIC_ID = /^[A-Z]{2,3}-\d{2}$/;
export const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const levelSchema = z.enum(['intro', 'intermediate', 'advanced']);
export type Level = z.infer<typeof levelSchema>;

export const reviewStatusSchema = z.enum(['draft', 'reviewed']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const lessonSourceSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
  publisher: z.string().optional(),
  license: z.string().optional(),
  /** Optional id of an entry in content/library/sources.yaml. */
  sourceId: z.string().regex(KEBAB_ID).optional(),
});
export type LessonSource = z.infer<typeof lessonSourceSchema>;

export const quizQuestionSchema = z
  .object({
    question: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2).max(6),
    /** Zero-based index of the correct choice. */
    answer: z.number().int().min(0),
    explanation: z.string().min(1),
  })
  .refine((q) => q.answer < q.choices.length, {
    message: 'answer must be a valid index into choices',
  });
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const lessonFrontmatterSchema = z.object({
  topicId: z.string().regex(TOPIC_ID),
  title: z.string().min(1),
  summary: z.string().min(1),
  level: levelSchema,
  status: reviewStatusSchema,
  version: z.number().int().min(1),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estimatedMinutes: z.number().int().min(1).max(240),
  objectives: z.array(z.string().min(1)).min(1),
  prerequisites: z.array(z.string().regex(TOPIC_ID)).default([]),
  concepts: z.array(z.string().regex(KEBAB_ID)).default([]),
  labs: z.array(z.string().regex(KEBAB_ID)).default([]),
  sources: z.array(lessonSourceSchema).min(1),
  quiz: z.array(quizQuestionSchema).default([]),
});
export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>;

export interface Lesson extends LessonFrontmatter {
  /** Markdown body (without frontmatter). */
  body: string;
  /** Section headings (## level) for the on-page table of contents. */
  headings: Array<{ id: string; text: string }>;
  /** Path of the source file, for "edit this lesson" links. */
  file: string;
}

export const glossaryTermSchema = z.object({
  id: z.string().regex(KEBAB_ID),
  term: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  short: z.string().min(1),
  long: z.string().optional(),
  related: z.array(z.string().regex(KEBAB_ID)).default([]),
  topicId: z.string().regex(TOPIC_ID).optional(),
});
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;

export const librarySourceSchema = z.object({
  id: z.string().regex(KEBAB_ID),
  title: z.string().min(1),
  authors: z.array(z.string()).optional(),
  edition: z.string().optional(),
  year: z.number().int().optional(),
  publisher: z.string().min(1),
  url: z.url(),
  isbn: z.string().optional(),
  kind: z.enum(['textbook', 'course-notes', 'standard', 'framework', 'guide', 'reference', 'book']),
  access: z.enum(['open', 'free', 'paid']),
  license: z.string().min(1),
  level: z.array(z.enum(['intro', 'undergrad', 'grad', 'practitioner'])).min(1),
  domains: z.array(z.string()).min(1),
  topics: z.array(z.string().regex(TOPIC_ID)).optional(),
  why: z.string().min(1),
  use: z.string().min(1),
  verifiedFrom: z.string().min(1),
});
export type LibrarySource = z.infer<typeof librarySourceSchema>;
