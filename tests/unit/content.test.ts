import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DOMAINS, getTopic } from '@/content/catalog';
import { LESSON_ISSUES } from '@/content/lessons';
import { parseAttackFile, parseGlossaryFile, parseLesson, parseLibraryFile } from '@/content/parse';
import type { Attack, GlossaryTerm, Lesson, LibrarySource } from '@/content/schema';
import { parseSequence } from '@/components/diagrams/sequence';
import { LABS } from '@/labs/registry';

/*
 * Validates every file under /content. Each file is parsed on its own, so one
 * broken file reports its own error without hiding problems in the others.
 * Run a single lesson's checks with: npx vitest run tests/unit/content.test.ts -t app-01.md
 */

const root = join(__dirname, '..', '..', 'content');

function filesIn(dir: string, pattern: RegExp): string[] {
  try {
    return readdirSync(join(root, dir))
      .filter((f) => pattern.test(f))
      .sort()
      .map((f) => join(root, dir, f));
  } catch {
    return [];
  }
}

function attempt<T>(fn: () => T): { value?: T; error?: Error } {
  try {
    return { value: fn() };
  } catch (error) {
    return { error: error as Error };
  }
}

const nameOf = (file: string) => file.split('/').pop() ?? file;
const domainIds = new Set(DOMAINS.map((d) => d.id));
const labIds = new Set(LABS.map((l) => l.id));

// Glossary --------------------------------------------------------------------

const glossaryParsed = filesIn('glossary', /\.ya?ml$/).map((file) => ({
  file,
  ...attempt(() => parseGlossaryFile(file, readFileSync(file, 'utf8'))),
}));
const glossary: GlossaryTerm[] = glossaryParsed.flatMap((g) => g.value ?? []);
const glossaryIds = new Set(glossary.map((t) => t.id));

describe('glossary', () => {
  it.each(glossaryParsed.map((g) => [nameOf(g.file), g] as const))('parses %s', (_n, g) => {
    if (g.error) throw g.error;
  });

  it('has unique ids across all files', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const g of glossaryParsed) {
      for (const term of g.value ?? []) {
        const first = seen.get(term.id);
        if (first) dupes.push(`${term.id} (${first} and ${nameOf(g.file)})`);
        else seen.set(term.id, nameOf(g.file));
      }
    }
    expect(dupes).toEqual([]);
  });

  it('only relates to terms that exist', () => {
    const broken = glossary.flatMap((t) =>
      t.related.filter((r) => !glossaryIds.has(r)).map((r) => `${t.id} -> ${r}`),
    );
    expect(broken).toEqual([]);
  });

  it('only links to terms that exist in long definitions', () => {
    const broken = glossary.flatMap((t) =>
      [...(t.long ?? '').matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g)]
        .map((m) => m[1]!)
        .filter((id) => !glossaryIds.has(id))
        .map((id) => `${t.id} -> ${id}`),
    );
    expect(broken).toEqual([]);
  });

  it('only references topics that exist', () => {
    const broken = glossary.filter((t) => t.topicId && !getTopic(t.topicId)).map((t) => t.id);
    expect(broken).toEqual([]);
  });
});

// Lessons ---------------------------------------------------------------------

const REQUIRED_SECTIONS: Array<string | string[]> = [
  'why it matters',
  'the core idea',
  'how it works',
  'worked example',
  ['defenses', 'in practice'],
  'common misconceptions',
  ['try it in the lab', 'try it yourself'],
  'key takeaways',
];

const lessonFiles = filesIn('lessons', /\.md$/);

describe('lesson loader', () => {
  it('loads every lesson the build sees without errors', () => {
    expect(LESSON_ISSUES).toEqual([]);
  });
});

describe.each(lessonFiles.map((f) => [nameOf(f), f] as const))('lesson %s', (_name, file) => {
  const source = readFileSync(file, 'utf8');
  const parsed = attempt<Lesson>(() => parseLesson(file, source));
  const lesson = parsed.value;

  it('has valid frontmatter for a real topic, named after the topic', () => {
    if (parsed.error) throw parsed.error;
    expect(getTopic(lesson!.topicId)).toBeDefined();
    expect(nameOf(file)).toBe(`${lesson!.topicId.toLowerCase()}.md`);
  });

  it.runIf(lesson)('lists concepts that exist in the glossary', () => {
    expect(lesson!.concepts.filter((c) => !glossaryIds.has(c))).toEqual([]);
  });

  it.runIf(lesson)('links only to glossary terms that exist', () => {
    const linked = [...lesson!.body.matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g)].map(
      (m) => m[1]!,
    );
    expect([...new Set(linked.filter((id) => !glossaryIds.has(id)))]).toEqual([]);
  });

  it.runIf(lesson)('links only to labs and lessons that exist', () => {
    const labLinks = [...lesson!.body.matchAll(/\]\(lab:([a-z0-9-]+)\)/g)].map((m) => m[1]!);
    expect(labLinks.filter((id) => !labIds.has(id))).toEqual([]);
    expect(lesson!.labs.filter((id) => !labIds.has(id))).toEqual([]);
    const topicLinks = [...lesson!.body.matchAll(/\]\(lesson:([A-Za-z]{2,3}-\d{2})\)/g)].map(
      (m) => m[1]!,
    );
    expect(topicLinks.filter((id) => !getTopic(id))).toEqual([]);
  });

  it.runIf(lesson)('has prerequisites that are other real topics', () => {
    expect(lesson!.prerequisites.filter((id) => !getTopic(id))).toEqual([]);
    expect(lesson!.prerequisites).not.toContain(lesson!.topicId);
  });

  it.runIf(lesson)('follows the section structure', () => {
    const headings = lesson!.headings.map((h) => h.text.toLowerCase());
    const missing = REQUIRED_SECTIONS.filter((required) =>
      Array.isArray(required)
        ? !required.some((r) => headings.includes(r))
        : !headings.includes(required),
    ).map((r) => (Array.isArray(r) ? r.join(' | ') : r));
    expect(missing).toEqual([]);
  });

  it.runIf(lesson)('has substance: objectives, a quiz, sources and enough explanation', () => {
    expect(lesson!.objectives.length).toBeGreaterThanOrEqual(2);
    expect(lesson!.quiz.length).toBeGreaterThanOrEqual(3);
    expect(lesson!.sources.length).toBeGreaterThanOrEqual(2);
    expect(lesson!.words).toBeGreaterThanOrEqual(800);
  });

  it.runIf(lesson)('has only https sources', () => {
    for (const s of lesson!.sources) expect(s.url.startsWith('https://'), s.url).toBe(true);
  });

  it.runIf(lesson)('labels every code block with a language', () => {
    const fences = [...lesson!.body.matchAll(/^```(.*)$/gm)].map((m) => m[1]!.trim());
    // Opening fences alternate with closing ones; every opening one needs a language.
    const openings = fences.filter((_f, i) => i % 2 === 0);
    expect(openings.filter((lang) => lang === '')).toEqual([]);
  });

  it.runIf(lesson)('has sequence diagrams that parse', () => {
    const blocks = [...lesson!.body.matchAll(/^```sequence\n([\s\S]*?)^```/gm)].map((m) => m[1]!);
    for (const block of blocks) {
      const result = parseSequence(block);
      expect(result.errors, block).toEqual([]);
    }
  });
});

// Library ---------------------------------------------------------------------

const libraryParsed = filesIn('library', /\.ya?ml$/).map((file) => ({
  file,
  ...attempt(() => parseLibraryFile(file, readFileSync(file, 'utf8'))),
}));
const library: LibrarySource[] = libraryParsed.flatMap((l) => l.value ?? []);

describe('library', () => {
  it.each(libraryParsed.map((l) => [nameOf(l.file), l] as const))('parses %s', (_n, l) => {
    if (l.error) throw l.error;
  });

  it('has unique ids', () => {
    const seen = new Set<string>();
    const dupes = library.filter((s) => (seen.has(s.id) ? true : (seen.add(s.id), false)));
    expect(dupes.map((s) => s.id)).toEqual([]);
  });

  it('uses https links and real domains and topics', () => {
    const problems: string[] = [];
    for (const s of library) {
      if (!s.url.startsWith('https://')) problems.push(`${s.id}: url is not https`);
      for (const d of s.domains) if (!domainIds.has(d)) problems.push(`${s.id}: domain ${d}`);
      for (const t of s.topics ?? []) if (!getTopic(t)) problems.push(`${s.id}: topic ${t}`);
      for (const section of s.sections ?? []) {
        for (const t of section.topics) if (!getTopic(t)) problems.push(`${s.id}: topic ${t}`);
        if (section.url && !section.url.startsWith('https://')) {
          problems.push(`${s.id}: section url is not https`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

// Attack index ----------------------------------------------------------------

const attackParsed = filesIn('coverage', /^attacks.*\.ya?ml$/).map((file) => ({
  file,
  ...attempt(() => parseAttackFile(file, readFileSync(file, 'utf8'))),
}));
const attacks: Attack[] = attackParsed.flatMap((a) => a.value ?? []);

describe('attack index', () => {
  it.each(attackParsed.map((a) => [nameOf(a.file), a] as const))('parses %s', (_n, a) => {
    if (a.error) throw a.error;
  });

  it('has unique ids and real topics and labs', () => {
    const seen = new Set<string>();
    const problems: string[] = [];
    for (const a of attacks) {
      if (seen.has(a.id)) problems.push(`duplicate ${a.id}`);
      seen.add(a.id);
      for (const t of a.topics) if (!getTopic(t)) problems.push(`${a.id}: topic ${t}`);
      for (const l of a.labs) if (!labIds.has(l)) problems.push(`${a.id}: lab ${l}`);
    }
    expect(problems).toEqual([]);
  });
});
