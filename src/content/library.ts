import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import { type LibrarySource, librarySourceSchema } from './schema';

const files = import.meta.glob<string>('/content/library/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export function parseLibraryFile(file: string, source: string): LibrarySource[] {
  const result = z.array(librarySourceSchema).safeParse(parseYaml(source) ?? []);
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
  for (const [file, source] of Object.entries(files)) {
    try {
      for (const entry of parseLibraryFile(file, source)) {
        if (seen.has(entry.id)) continue;
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

const byId = new Map(LIBRARY.map((s) => [s.id, s]));

export function getSource(id: string): LibrarySource | undefined {
  return byId.get(id);
}

export function sourcesForTopic(topicId: string): LibrarySource[] {
  const domain = topicId.split('-')[0] ?? '';
  const exact = LIBRARY.filter((s) => s.topics?.includes(topicId));
  const byDomain = LIBRARY.filter(
    (s) => !s.topics?.includes(topicId) && s.domains.includes(domain),
  );
  return [...exact, ...byDomain];
}
