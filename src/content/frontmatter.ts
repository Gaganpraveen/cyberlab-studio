import { parse as parseYaml } from 'yaml';

export interface FrontmatterResult {
  data: unknown;
  body: string;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Split a Markdown file into its YAML frontmatter and body. */
export function parseFrontmatter(source: string): FrontmatterResult {
  const match = FENCE.exec(source);
  if (!match) return { data: {}, body: source };
  return { data: parseYaml(match[1] ?? '') ?? {}, body: source.slice(match[0].length) };
}
