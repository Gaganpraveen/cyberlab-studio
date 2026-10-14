import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import { type GlossaryTerm, glossaryTermSchema } from './schema';

const files = import.meta.glob<string>('/content/glossary/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Parse one glossary file (a YAML list of terms). Throws when invalid. */
export function parseGlossaryFile(file: string, source: string): GlossaryTerm[] {
  const result = z.array(glossaryTermSchema).safeParse(parseYaml(source) ?? []);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid glossary file ${file}: ${details}`);
  }
  return result.data;
}

function loadAll(): GlossaryTerm[] {
  const terms = new Map<string, GlossaryTerm>();
  for (const [file, source] of Object.entries(files)) {
    try {
      for (const term of parseGlossaryFile(file, source)) {
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
