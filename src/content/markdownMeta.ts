import { parse as parseYaml } from 'yaml';

import { slugify } from '../lib/slug.ts';

/*
 * Pure helpers shared by the build-time content plugin and the tests. This
 * module uses relative imports only, because the Vite config imports it.
 */

export interface FrontmatterResult {
  data: unknown;
  body: string;
}

export interface Heading {
  id: string;
  text: string;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Split a Markdown file into its YAML frontmatter and body. */
export function parseFrontmatter(source: string): FrontmatterResult {
  const match = FENCE.exec(source);
  if (!match) return { data: {}, body: source };
  return { data: parseYaml(match[1] ?? '') ?? {}, body: source.slice(match[0].length) };
}

/**
 * The visible text of a heading's Markdown, matching what the renderer shows:
 * glossary links become their label, links their text, and emphasis and code
 * markers are dropped.
 */
export function headingText(raw: string): string {
  return raw
    .replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([a-z0-9-]+)\]\]/g, (_m, id: string) => id.replace(/-/g, ' '))
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

const CODE_FENCE = /^\s*(```|~~~)/;

/** Level-2 headings outside code blocks, in order, with the ids the renderer gives them. */
export function extractHeadings(body: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (CODE_FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      const text = headingText(match[1] ?? '');
      headings.push({ id: slugify(text), text });
    }
  }
  return headings;
}

/** Approximate count of prose words, ignoring fenced code blocks. */
export function countWords(body: string): number {
  let inFence = false;
  let words = 0;
  for (const line of body.split(/\r?\n/)) {
    if (CODE_FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    words += line.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  }
  return words;
}
