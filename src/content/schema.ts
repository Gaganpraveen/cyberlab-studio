import { z } from 'zod';

/**
 * Content contracts. Lessons, glossary terms, library sources and the attack
 * index live as plain text files under /content so instructors can edit them
 * without touching application code; these schemas validate them at load
 * time and in the test suite.
 */

export const TOPIC_ID = /^[A-Z]{2,3}-\d{2}$/;
export const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DOMAIN_ID = /^[A-Z]{2,3}$/;

export const levelSchema = z.enum(['intro', 'intermediate', 'advanced']);
export type Level = z.infer<typeof levelSchema>;

export const reviewStatusSchema = z.enum(['draft', 'reviewed']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const lessonSourceSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
  publisher: z.string().optional(),
  license: z.string().optional(),
  /** Optional id of an entry in the library (content/library/*.yaml). */
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
  /** Extra search words: abbreviations, synonyms, standard ids (e.g. "SQLi", "CWE-89"). */
  keywords: z.array(z.string().min(1)).default([]),
  sources: z.array(lessonSourceSchema).min(1),
  quiz: z.array(quizQuestionSchema).default([]),
});
export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>;

export interface LessonHeading {
  id: string;
  text: string;
}

/** Everything about a lesson except its body, available without loading the body. */
export interface LessonMeta extends LessonFrontmatter {
  /** Section headings (## level) for the on-page table of contents. */
  headings: LessonHeading[];
  /** Approximate word count of the body. */
  words: number;
  /** Path of the source file, for "edit this lesson" links. */
  file: string;
}

export interface Lesson extends LessonMeta {
  /** Markdown body (without frontmatter). */
  body: string;
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

export const librarySectionSchema = z.object({
  /** Chapter or section as the source names it, e.g. "Ch. 5: Database and Data Center Security". */
  title: z.string().min(1),
  topics: z.array(z.string().regex(TOPIC_ID)).min(1),
  /** Deep link to the section when the source is online. */
  url: z.url().optional(),
});
export type LibrarySection = z.infer<typeof librarySectionSchema>;

export const libraryKindSchema = z.enum([
  'textbook',
  'book',
  'course-notes',
  'course',
  'standard',
  'framework',
  'guide',
  'reference',
  'paper',
]);
export type LibraryKind = z.infer<typeof libraryKindSchema>;

export const libraryAccessSchema = z.enum(['open', 'free', 'paid']);
export type LibraryAccess = z.infer<typeof libraryAccessSchema>;

export const librarySourceSchema = z.object({
  id: z.string().regex(KEBAB_ID),
  title: z.string().min(1),
  authors: z.array(z.string()).optional(),
  edition: z.string().optional(),
  year: z.number().int().optional(),
  publisher: z.string().min(1),
  url: z.url(),
  isbn: z.string().optional(),
  kind: libraryKindSchema,
  /** open: openly licensed; free: free to read online; paid: purchase or library access. */
  access: libraryAccessSchema,
  license: z.string().min(1),
  level: z.array(z.enum(['intro', 'undergrad', 'grad', 'practitioner'])).min(1),
  domains: z.array(z.string().regex(DOMAIN_ID)).min(1),
  /** Topics the source as a whole supports. */
  topics: z.array(z.string().regex(TOPIC_ID)).optional(),
  /** Chapter- or section-level pointers into the source, per topic. */
  sections: z.array(librarySectionSchema).optional(),
  why: z.string().min(1),
  use: z.string().min(1),
  /** Where the edition, year and license were checked (a URL or a short note). */
  verifiedFrom: z.string().min(1),
});
export type LibrarySource = z.infer<typeof librarySourceSchema>;

export const attackCategorySchema = z.enum([
  'social-engineering',
  'web',
  'injection',
  'network',
  'malware',
  'identity',
  'cryptographic',
  'system',
  'availability',
  'supply-chain',
  'cloud',
  'wireless-iot',
  'physical',
  'ai',
  'insider',
]);
export type AttackCategory = z.infer<typeof attackCategorySchema>;

/** One entry in the attack index: what it is, where it is taught, and the standard ids. */
export const attackSchema = z.object({
  id: z.string().regex(KEBAB_ID),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  category: attackCategorySchema,
  /** One or two plain sentences on what the attack does and why it works. */
  summary: z.string().min(1),
  /** The main defenses, a few words each. */
  defenses: z.array(z.string().min(1)).min(1),
  /** Catalog topics where the attack is taught (first = primary). */
  topics: z.array(z.string().regex(TOPIC_ID)).min(1),
  /** Labs that practice it, by lab id. */
  labs: z.array(z.string().regex(KEBAB_ID)).default([]),
  /** MITRE ATT&CK technique ids, e.g. T1566 or T1566.002. */
  attack: z.array(z.string().regex(/^T\d{4}(?:\.\d{3})?$/)).default([]),
  /** MITRE CWE ids for the weakness it exploits, e.g. CWE-89. */
  cwe: z.array(z.string().regex(/^CWE-\d+$/)).default([]),
  /** MITRE CAPEC attack-pattern ids, e.g. CAPEC-66. */
  capec: z.array(z.string().regex(/^CAPEC-\d+$/)).default([]),
  /** OWASP Top 10 categories as OWASP writes them: "A05:2025", "API1:2023", "LLM01:2025". */
  owasp: z.array(z.string().regex(/^(?:A\d{2}|API\d{1,2}|LLM\d{2}):\d{4}$/)).default([]),
});
export type Attack = z.infer<typeof attackSchema>;
