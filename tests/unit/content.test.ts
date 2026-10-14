import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getTopic } from '@/content/catalog';
import { parseGlossaryFile } from '@/content/glossary';
import { parseLesson } from '@/content/lessons';
import { parseLibraryFile } from '@/content/library';
import { LABS } from '@/labs/registry';

const root = join(__dirname, '..', '..', 'content');

function filesIn(dir: string, ext: string): string[] {
  try {
    return readdirSync(join(root, dir))
      .filter((f) => f.endsWith(ext))
      .map((f) => join(root, dir, f));
  } catch {
    return [];
  }
}

const glossaryFiles = filesIn('glossary', '.yaml');
const glossary = glossaryFiles.flatMap((file) => parseGlossaryFile(file, readFileSync(file, 'utf8')));
const glossaryIds = new Set(glossary.map((t) => t.id));
const labIds = new Set(LABS.map((l) => l.id));

describe('glossary', () => {
  it('parses every glossary file', () => {
    for (const file of glossaryFiles) {
      expect(() => parseGlossaryFile(file, readFileSync(file, 'utf8'))).not.toThrow();
    }
  });

  it('has unique ids across all files', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const term of glossary) {
      if (seen.has(term.id)) dupes.push(term.id);
      seen.add(term.id);
    }
    expect(dupes).toEqual([]);
  });

  it('only relates to terms that exist', () => {
    const broken = glossary.flatMap((t) =>
      t.related.filter((r) => !glossaryIds.has(r)).map((r) => `${t.id} -> ${r}`),
    );
    expect(broken).toEqual([]);
  });

  it('only references topics that exist', () => {
    const broken = glossary.filter((t) => t.topicId && !getTopic(t.topicId)).map((t) => t.id);
    expect(broken).toEqual([]);
  });
});

const lessonFiles = filesIn('lessons', '.md');

describe.each(lessonFiles.map((f) => [f.split('/').pop()!, f]))('lesson %s', (_name, file) => {
  const source = readFileSync(file, 'utf8');
  const lesson = parseLesson(file, source);

  it('has valid frontmatter for a real topic', () => {
    expect(getTopic(lesson.topicId)).toBeDefined();
    expect(file.endsWith(`${lesson.topicId.toLowerCase()}.md`)).toBe(true);
  });

  it('lists concepts that exist in the glossary', () => {
    expect(lesson.concepts.filter((c) => !glossaryIds.has(c))).toEqual([]);
  });

  it('links only to glossary terms that exist', () => {
    const linked = [...lesson.body.matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]!);
    expect(linked.filter((id) => !glossaryIds.has(id))).toEqual([]);
  });

  it('links only to labs and lessons that exist', () => {
    const labLinks = [...lesson.body.matchAll(/\]\(lab:([a-z0-9-]+)\)/g)].map((m) => m[1]!);
    expect(labLinks.filter((id) => !labIds.has(id))).toEqual([]);
    expect(lesson.labs.filter((id) => !labIds.has(id))).toEqual([]);
    const lessonLinks = [...lesson.body.matchAll(/\]\(lesson:([A-Za-z]{2,3}-\d{2})\)/g)].map((m) => m[1]!);
    expect(lessonLinks.filter((id) => !getTopic(id))).toEqual([]);
  });

  it('has prerequisites that are real topics', () => {
    expect(lesson.prerequisites.filter((id) => !getTopic(id))).toEqual([]);
  });

  it('follows the section structure', () => {
    const headings = lesson.headings.map((h) => h.text.toLowerCase());
    for (const required of ['why it matters', 'how it works', 'common misconceptions']) {
      expect(headings).toContain(required);
    }
  });

  it('has only https sources', () => {
    for (const s of lesson.sources) expect(s.url.startsWith('https://')).toBe(true);
  });
});

describe('library', () => {
  const files = filesIn('library', '.yaml');
  it('parses and references real topics and domains', () => {
    const domainIds = new Set(['FND', 'NET', 'CRY', 'IAM', 'WEB', 'APP', 'SYS', 'OPS', 'MAL', 'FOR', 'CLD', 'IOT', 'HUM', 'GRC', 'AI', 'RES']);
    for (const file of files) {
      const sources = parseLibraryFile(file, readFileSync(file, 'utf8'));
      const ids = new Set<string>();
      for (const s of sources) {
        expect(ids.has(s.id), `duplicate ${s.id}`).toBe(false);
        ids.add(s.id);
        expect(s.url.startsWith('https://'), `${s.id} url`).toBe(true);
        for (const d of s.domains) expect(domainIds.has(d), `${s.id} domain ${d}`).toBe(true);
        for (const t of s.topics ?? []) expect(getTopic(t), `${s.id} topic ${t}`).toBeDefined();
      }
    }
  });
});
