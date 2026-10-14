import { readdirSync, readFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { parse } from 'yaml';

/** Uncaught page errors and console errors, collected for the life of the page. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

/** Serious and critical axe violations against WCAG 2.2 A and AA. */
export async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')}`);
}

// The site's content, read from the repository, so the sweep covers everything that ships.

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const list = (dir: string, pattern: RegExp) =>
  readdirSync(new URL(dir, root))
    .filter((name) => pattern.test(name))
    .sort();

export const LESSONS = list('content/lessons/', /\.md$/).map((file) => {
  const meta = parse(/^---\n([\s\S]*?)\n---/.exec(read(`content/lessons/${file}`))?.[1] ?? '');
  const id = String(meta.topicId);
  const quizLength = Array.isArray(meta.quiz) ? meta.quiz.length : 0;
  return { id, title: String(meta.title), domain: id.split('-')[0]!, quizLength };
});

export const LABS = readdirSync(new URL('src/labs/', root), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'components')
  .map((entry) => {
    const source = read(`src/labs/${entry.name}/index.ts`);
    const id = /\n {2}id: '([^']+)'/.exec(source)?.[1];
    const title = /\n {2}title: (['"])(.+?)\1,/.exec(source)?.[2];
    if (!id || !title) throw new Error(`Cannot read the id and title of lab ${entry.name}`);
    return { id, title: title.replace(/\\'/g, "'") };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export const ATTACKS = (
  parse(read('content/coverage/attacks.yaml')) as Array<{ id: string; name: string }>
).map(({ id, name }) => ({ id, name }));

export const GLOSSARY = list('content/glossary/', /\.ya?ml$/).flatMap((file) =>
  (parse(read(`content/glossary/${file}`)) as Array<{ id: string; term: string }>).map(
    ({ id, term }) => ({ id, term }),
  ),
);
