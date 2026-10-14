import { z } from 'zod';

import { type GlossaryTerm, glossaryTermSchema } from './schema';

/** Glossary YAML files, parsed to JSON at build time (scripts/vite-plugin-content.ts). */
const files = import.meta.glob<unknown>('/content/glossary/*.yaml', {
  query: '?data',
  import: 'default',
  eager: true,
});

/** Validate one glossary file (a list of terms). Throws when invalid. */
export function toGlossaryTerms(file: string, data: unknown): GlossaryTerm[] {
  const result = z.array(glossaryTermSchema).safeParse(data ?? []);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid glossary file ${file}: ${details}`);
  }
  return result.data;
}

function loadAll(): GlossaryTerm[] {
  const terms = new Map<string, GlossaryTerm>();
  for (const [file, data] of Object.entries(files)) {
    try {
      for (const term of toGlossaryTerms(file, data)) {
        if (terms.has(term.id)) {
          console.error(`Duplicate glossary id "${term.id}" in ${file}; keeping the first.`);
          continue;
        }
        terms.set(term.id, term);
      }
    } catch (error) {
      console.error((error as Error).message);
    }
  }
  return [...terms.values()].sort((a, b) => a.term.localeCompare(b.term));
}

export const GLOSSARY: GlossaryTerm[] = loadAll();

const byId = new Map(GLOSSARY.map((term) => [term.id, term]));

export function getTerm(id: string): GlossaryTerm | undefined {
  return byId.get(id);
}

/** Terms that point at this one through `related`, for "see also" lists. */
export function termsRelatedTo(id: string): GlossaryTerm[] {
  return GLOSSARY.filter((term) => term.id !== id && term.related.includes(id));
}

export function termsForTopic(topicId: string): GlossaryTerm[] {
  return GLOSSARY.filter((term) => term.topicId === topicId);
}
