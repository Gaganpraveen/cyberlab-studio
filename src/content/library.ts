import { z } from 'zod';

import {
  type LibraryKind,
  type LibrarySection,
  type LibrarySource,
  librarySourceSchema,
} from './schema';

/** Library YAML files, parsed to JSON at build time (scripts/vite-plugin-content.ts). */
const files = import.meta.glob<unknown>('/content/library/*.yaml', {
  query: '?data',
  import: 'default',
  eager: true,
});

/** Validate one library file (a list of sources). Throws when invalid. */
export function toLibrarySources(file: string, data: unknown): LibrarySource[] {
  const result = z.array(librarySourceSchema).safeParse(data ?? []);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid library file ${file}: ${details}`);
  }
  return result.data;
}

function loadAll(): LibrarySource[] {
  const sources: LibrarySource[] = [];
  const seen = new Set<string>();
  for (const [file, data] of Object.entries(files)) {
    try {
      for (const entry of toLibrarySources(file, data)) {
        if (seen.has(entry.id)) {
          console.error(`Duplicate library id "${entry.id}" in ${file}; keeping the first.`);
          continue;
        }
        seen.add(entry.id);
        sources.push(entry);
      }
    } catch (error) {
      console.error((error as Error).message);
    }
  }
  return sources;
}

export const LIBRARY: LibrarySource[] = loadAll();

export interface TopicReading {
  source: LibrarySource;
  /** Chapters or sections of the source that cover this topic. */
  sections: LibrarySection[];
}

const KIND_ORDER: Record<LibrarySource['kind'], number> = {
  textbook: 0,
  'course-notes': 1,
  course: 1,
  book: 2,
  guide: 3,
  standard: 4,
  framework: 5,
  reference: 6,
  paper: 7,
};

const ACCESS_ORDER: Record<LibrarySource['access'], number> = { open: 0, free: 1, paid: 2 };

/**
 * Sources that cover a topic, with the matching chapters, most useful first:
 * open textbooks and course notes, then books, then standards and references.
 */
export function readingsForTopic(topicId: string): TopicReading[] {
  const id = topicId.toUpperCase();
  const readings: TopicReading[] = [];
  for (const source of LIBRARY) {
    const sections = (source.sections ?? []).filter((s) => s.topics.includes(id));
    if (sections.length > 0 || source.topics?.includes(id)) readings.push({ source, sections });
  }
  return readings.sort(
    (a, b) =>
      KIND_ORDER[a.source.kind] - KIND_ORDER[b.source.kind] ||
      ACCESS_ORDER[a.source.access] - ACCESS_ORDER[b.source.access],
  );
}

export const LIBRARY_KIND_LABELS: Record<LibraryKind, string> = {
  textbook: 'Textbook',
  book: 'Book',
  'course-notes': 'Course notes',
  course: 'Course',
  standard: 'Standard',
  framework: 'Framework',
  guide: 'Guide',
  reference: 'Reference',
  paper: 'Paper',
};
