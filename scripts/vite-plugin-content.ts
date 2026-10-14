import { readFileSync } from 'node:fs';

import type { Plugin } from 'vite';
import { parse as parseYaml } from 'yaml';

import { countWords, extractHeadings, parseFrontmatter } from '../src/content/markdownMeta.ts';

/** Frontmatter fields only the lesson page uses; they ship with the lesson body. */
const DETAIL_KEYS = ['objectives', 'sources', 'quiz'] as const;

/**
 * Turns the plain-text course content into small JavaScript modules at build
 * time, so the browser never ships a YAML parser and lesson bodies load only
 * when a lesson is opened.
 *
 * Use it through import.meta.glob with a query:
 * - `lesson.md?meta`: the frontmatter the whole app needs, section headings
 *   and word count (bundled up front for the topic map and search).
 * - `lesson.md?detail`: objectives, sources, quiz and the Markdown body,
 *   loaded when the lesson is opened.
 * - `file.yaml?data`: the parsed YAML document.
 */
export function contentPlugin(): Plugin {
  return {
    name: 'cyberlab-content',
    enforce: 'pre',
    load(id) {
      const [path = '', query = ''] = id.split('?', 2);
      if (!query) return null;
      const params = new URLSearchParams(query);

      if (path.endsWith('.md') && (params.has('meta') || params.has('detail'))) {
        this.addWatchFile(path);
        const { data, body } = parseFrontmatter(readFileSync(path, 'utf8'));
        const fields = (data ?? {}) as Record<string, unknown>;
        if (params.has('detail')) {
          const detail: Record<string, unknown> = { body };
          for (const key of DETAIL_KEYS) detail[key] = fields[key];
          return `export default ${JSON.stringify(detail)};`;
        }
        const index = Object.fromEntries(
          Object.entries(fields).filter(
            ([key]) => !(DETAIL_KEYS as readonly string[]).includes(key),
          ),
        );
        const meta = { data: index, headings: extractHeadings(body), words: countWords(body) };
        return `export default ${JSON.stringify(meta)};`;
      }

      if (/\.ya?ml$/.test(path) && params.has('data')) {
        this.addWatchFile(path);
        const data = parseYaml(readFileSync(path, 'utf8')) ?? [];
        return `export default ${JSON.stringify(data)};`;
      }

      return null;
    },
  };
}
