import { readFileSync } from 'node:fs';

import type { Plugin } from 'vite';
import { parse as parseYaml } from 'yaml';

import { countWords, extractHeadings, parseFrontmatter } from '../src/content/markdownMeta.ts';

/**
 * Turns the plain-text course content into small JavaScript modules at build
 * time, so the browser never ships a YAML parser and lesson bodies load only
 * when a lesson is opened.
 *
 * Use it through import.meta.glob with a query:
 * - `lesson.md?meta`: frontmatter data, section headings and word count.
 * - `lesson.md?body`: the Markdown body as a string, without frontmatter.
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

      if (path.endsWith('.md') && (params.has('meta') || params.has('body'))) {
        this.addWatchFile(path);
        const { data, body } = parseFrontmatter(readFileSync(path, 'utf8'));
        if (params.has('body')) return `export default ${JSON.stringify(body)};`;
        const meta = { data, headings: extractHeadings(body), words: countWords(body) };
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
