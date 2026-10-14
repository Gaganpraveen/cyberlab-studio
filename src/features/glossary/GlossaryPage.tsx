import { ArrowLeft, ArrowRight, BookMarked, BookOpen, Search } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { Markdown } from '@/components/markdown/Markdown';
import { ButtonLink } from '@/components/ui/Button';
import { Badge, EmptyState, inputClasses, PageHeader } from '@/components/ui/primitives';
import { DOMAINS, getTopic } from '@/content/catalog';
import { getTerm, GLOSSARY, termsRelatedTo } from '@/content/glossary';
import { LESSONS } from '@/content/lessons';
import type { GlossaryTerm } from '@/content/schema';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/cn';

function letterOf(term: GlossaryTerm): string {
  const first = term.term.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

function matches(term: GlossaryTerm, query: string): boolean {
  if (!query) return true;
  return (
    term.term.toLowerCase().includes(query) ||
    term.id.includes(query) ||
    term.short.toLowerCase().includes(query) ||
    term.aliases.some((alias) => alias.toLowerCase().includes(query))
  );
}

function TermChip({ term }: { term: GlossaryTerm }) {
  return (
    <Link
      to={`/glossary/${term.id}`}
      title={term.short}
      className="border-line bg-surface hover:border-line-strong hover:text-fg text-fg-muted inline-flex rounded-full border px-3 py-1 text-sm transition-colors"
    >
      {term.term}
    </Link>
  );
}

function TermDetail({ term }: { term: GlossaryTerm }) {
  useDocumentTitle(`${term.term} · Glossary`);
  const topic = term.topicId ? getTopic(term.topicId) : undefined;
  const related = [
    ...term.related.map((id) => getTerm(id)).filter((t): t is GlossaryTerm => !!t),
    ...termsRelatedTo(term.id).filter((t) => !term.related.includes(t.id)),
  ];
  const lessons = LESSONS.filter((lesson) => lesson.concepts.includes(term.id));
  const index = GLOSSARY.findIndex((t) => t.id === term.id);
  const prev = index > 0 ? GLOSSARY[index - 1] : undefined;
  const next = index >= 0 && index < GLOSSARY.length - 1 ? GLOSSARY[index + 1] : undefined;

  return (
    <PageContainer width="narrow">
      <Link
        to="/glossary"
        className="text-fg-subtle hover:text-fg mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden /> Glossary
      </Link>

      <article>
        <div className="text-fg-subtle mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-[0.1em] uppercase">
          <BookMarked className="size-3.5" aria-hidden /> Glossary term
        </div>
        <h1 className="text-fg text-[2rem] leading-tight font-semibold tracking-tight text-balance">
          {term.term}
        </h1>
        {term.aliases.length > 0 && (
          <p className="text-fg-subtle mt-2 text-sm">Also called {term.aliases.join(', ')}</p>
        )}
        <p className="text-fg mt-5 text-lg leading-relaxed text-pretty">{term.short}</p>
        {term.long && (
          <div className="mt-5">
            <Markdown>{term.long}</Markdown>
          </div>
        )}

        {topic && (
          <Link
            to={`/learn/${topic.id.toLowerCase()}`}
            className="border-line bg-surface hover:border-line-strong group mt-8 flex items-center gap-3 rounded-xl border p-4 transition-colors"
          >
            <BookOpen className="text-accent-text size-5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="text-fg-subtle block text-xs">Taught in {topic.id}</span>
              <span className="text-fg group-hover:text-accent-text block font-medium">
                {topic.title}
              </span>
            </span>
            <ArrowRight className="text-fg-subtle size-4" aria-hidden />
          </Link>
        )}

        {related.length > 0 && (
          <section className="mt-8" aria-labelledby="related-terms">
            <h2 id="related-terms" className="text-fg mb-3 text-base font-semibold">
              Related terms
            </h2>
            <div className="flex flex-wrap gap-2">
              {related.map((t) => (
                <TermChip key={t.id} term={t} />
              ))}
            </div>
          </section>
        )}

        {lessons.length > 0 && (
          <section className="mt-8" aria-labelledby="term-lessons">
            <h2 id="term-lessons" className="text-fg mb-3 text-base font-semibold">
              Lessons that teach it
            </h2>
            <ul className="space-y-1.5">
              {lessons.map((lesson) => (
                <li key={lesson.topicId}>
                  <Link
                    to={`/learn/${lesson.topicId.toLowerCase()}`}
                    className="text-fg-muted hover:text-accent-text text-sm transition-colors"
                  >
                    <span className="text-fg-subtle mr-2 font-mono text-xs">{lesson.topicId}</span>
                    {lesson.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <nav
        aria-label="Neighboring terms"
        className="border-line mt-10 flex justify-between gap-4 border-t pt-6 text-sm"
      >
        {prev ? (
          <Link to={`/glossary/${prev.id}`} className="text-fg-muted hover:text-fg truncate">
            ← {prev.term}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/glossary/${next.id}`} className="text-fg-muted hover:text-fg truncate">
            {next.term} →
          </Link>
        )}
      </nav>
    </PageContainer>
  );
}

function GlossaryIndex() {
  useDocumentTitle('Glossary');
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const filtered = useMemo(
    () =>
      GLOSSARY.filter(
        (term) => matches(term, deferred) && (!domain || term.topicId?.startsWith(`${domain}-`)),
      ),
    [deferred, domain],
  );

  const groups = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const term of filtered) {
      const letter = letterOf(term);
      map.set(letter, [...(map.get(letter) ?? []), term]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a < b ? -1 : 1));
  }, [filtered]);

  const letters = new Set(groups.map(([letter]) => letter));

  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Glossary"
        title="Every term, defined and linked"
        description={`${GLOSSARY.length} terms. Lessons underline these words; hover or tap one to see its definition without leaving the page.`}
      />

      <div className="bg-canvas/90 sticky top-14 z-10 -mx-4 mt-6 space-y-3 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms and definitions"
              aria-label="Search the glossary"
              className={cn(inputClasses, 'pl-9')}
            />
          </div>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            aria-label="Filter by area"
            className={cn(inputClasses, 'sm:w-64')}
          >
            <option value="">All areas</option>
            {DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
        <nav aria-label="Jump to letter" className="flex flex-wrap gap-1">
          {[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'].map((letter) =>
            letters.has(letter) ? (
              <a
                key={letter}
                href={`#letter-${letter}`}
                onClick={(event) => {
                  event.preventDefault();
                  document
                    .getElementById(`letter-${letter}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="text-fg-muted hover:bg-surface-2 hover:text-fg flex size-7 items-center justify-center rounded-md font-mono text-xs transition-colors"
              >
                {letter}
              </a>
            ) : (
              <span
                key={letter}
                className="text-fg-subtle/50 flex size-7 items-center justify-center font-mono text-xs"
                aria-hidden
              >
                {letter}
              </span>
            ),
          )}
        </nav>
      </div>

      <p className="text-fg-subtle mt-2 text-xs" role="status">
        {filtered.length === GLOSSARY.length
          ? `${GLOSSARY.length} terms`
          : `${filtered.length} of ${GLOSSARY.length} terms`}
      </p>

      {groups.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={BookMarked} title="No terms match">
            Try a shorter search or a different area.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-4 space-y-10">
          {groups.map(([letter, terms]) => (
            <section key={letter} aria-labelledby={`letter-${letter}`}>
              <h2
                id={`letter-${letter}`}
                className="text-fg border-line mb-3 scroll-mt-44 border-b pb-2 font-mono text-lg font-semibold"
              >
                {letter}
              </h2>
              <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                {terms.map((term) => {
                  const topic = term.topicId ? getTopic(term.topicId) : undefined;
                  return (
                    <li key={term.id}>
                      <Link
                        to={`/glossary/${term.id}`}
                        className="hover:bg-surface group -mx-3 block rounded-lg px-3 py-2.5 transition-colors"
                      >
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-fg group-hover:text-accent-text font-medium">
                            {term.term}
                          </span>
                          {term.aliases.length > 0 && (
                            <span className="text-fg-subtle text-xs">
                              {term.aliases.slice(0, 3).join(' · ')}
                            </span>
                          )}
                        </span>
                        <span className="text-fg-muted mt-0.5 line-clamp-2 block text-sm leading-relaxed">
                          {term.short}
                        </span>
                        {topic && (
                          <span className="mt-1 inline-block">
                            <Badge tone="neutral">{topic.domainTitle}</Badge>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default function GlossaryPage() {
  const { termId } = useParams();
  if (!termId) return <GlossaryIndex />;
  const term = getTerm(termId);
  if (!term) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          icon={BookMarked}
          title="That term isn’t in the glossary yet"
          action={<ButtonLink to="/glossary">Browse the glossary</ButtonLink>}
        />
      </PageContainer>
    );
  }
  return <TermDetail key={term.id} term={term} />;
}
