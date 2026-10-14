import { parse as parseYaml } from 'yaml';

import { toAttacks } from './attacks';
import { toGlossaryTerms } from './glossary';
import { toLessonDetail, toLessonMeta } from './lessons';
import { toLibrarySources } from './library';
import { countWords, extractHeadings, parseFrontmatter } from './markdownMeta';
import type { Attack, GlossaryTerm, Lesson, LibrarySource } from './schema';

/*
 * Parse content straight from source text, the same way the build does. Used
 * by the test suite and tooling; the app itself loads pre-parsed modules.
 */

export function parseLesson(file: string, source: string): Lesson {
  const { data, body } = parseFrontmatter(source);
  const meta = toLessonMeta(file, {
    data,
    headings: extractHeadings(body),
    words: countWords(body),
  });
  const detail = toLessonDetail(file, { ...(data as object), body });
  return { ...meta, ...detail };
}

export function parseGlossaryFile(file: string, source: string): GlossaryTerm[] {
  return toGlossaryTerms(file, parseYaml(source));
}

export function parseLibraryFile(file: string, source: string): LibrarySource[] {
  return toLibrarySources(file, parseYaml(source));
}

export function parseAttackFile(file: string, source: string): Attack[] {
  return toAttacks(file, parseYaml(source));
}
