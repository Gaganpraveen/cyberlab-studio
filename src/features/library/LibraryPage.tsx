import { BookOpen, ChevronDown, Library, Search } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { AccessBadge } from '@/components/ui/badges';
import { Badge, EmptyState, inputClasses, PageHeader } from '@/components/ui/primitives';
import { DOMAINS, getTopic } from '@/content/catalog';
import { LIBRARY, LIBRARY_KIND_LABELS } from '@/content/library';
import type { LibraryAccess, LibrarySource } from '@/content/schema';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/cn';
import { SITE } from '@/lib/site';

import { sourceByline } from './ReadingList';

type KindFilter = 'all' | 'books' | 'courses' | 'standards' | 'references';

const KIND_FILTERS: Array<{ id: KindFilter; label: string; kinds: LibrarySource['kind'][] }> = [
  { id: 'all', label: 'All', kinds: [] },
  { id: 'books', label: 'Textbooks and books', kinds: ['textbook', 'book'] },
  { id: 'courses', label: 'Courses and notes', kinds: ['course', 'course-notes'] },
  { id: 'standards', label: 'Standards and frameworks', kinds: ['standard', 'framework'] },
  { id: 'references', label: 'Guides, references, papers', kinds: ['guide', 'reference', 'paper'] },
];

const ACCESS_FILTERS: Array<{ id: LibraryAccess | 'all'; label: string }> = [
  { id: 'all', label: 'Any access' },
  { id: 'open', label: 'Open license' },
  { id: 'free', label: 'Free to read' },
  { id: 'paid', label: 'Purchase or library' },
];

const KIND_ORDER: LibrarySource['kind'][] = [
  'textbook',
  'course-notes',
  'course',
  'book',
  'guide',
  'standard',
  'framework',
  'reference',
  'paper',
];

function topicsOf(source: LibrarySource): string[] {
  const ids = new Set(source.topics ?? []);
  for (const section of source.sections ?? []) for (const t of section.topics) ids.add(t);
  return [...ids].sort();
}

function SourceCard({ source }: { source: LibrarySource }) {
  const [open, setOpen] = useState(false);
  const topics = topicsOf(source);
  const sections = source.sections ?? [];
  return (
    <li id={source.id} className="border-line bg-surface scroll-mt-20 rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg hover:text-accent-text text-base font-semibold transition-colors"
          >
            {source.title}
          </a>
          <div className="text-fg-subtle mt-1 text-xs leading-relaxed">{sourceByline(source)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{LIBRARY_KIND_LABELS[source.kind]}</Badge>
          <AccessBadge access={source.access} />
        </div>
      </div>

      <p className="text-fg-muted mt-3 text-sm leading-relaxed">{source.why}</p>
      <p className="text-fg-muted mt-2 text-sm leading-relaxed">
        <span className="text-fg font-medium">How to use it: </span>
        {source.use}
      </p>

      {topics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {topics.slice(0, open ? topics.length : 10).map((id) => (
            <Link
              key={id}
              to={`/learn/${id.toLowerCase()}`}
              title={getTopic(id)?.title}
              className="border-line text-fg-muted hover:text-fg hover:border-line-strong rounded-md border px-2 py-0.5 font-mono text-xs transition-colors"
            >
              {id}
            </Link>
          ))}
          {!open && topics.length > 10 && (
            <span className="text-fg-subtle px-1 text-xs leading-6">
              +{topics.length - 10} more
            </span>
          )}
        </div>
      )}

      {(sections.length > 0 || topics.length > 10) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-accent-text mt-3 inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          <ChevronDown
            className={cn('size-4 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
          {open
            ? 'Show less'
            : sections.length > 0
              ? `Chapters mapped to topics (${sections.length})`
              : 'All topics'}
        </button>
      )}

      {open && sections.length > 0 && (
        <ul className="border-line mt-3 space-y-2 border-t pt-3">
          {sections.map((section) => (
            <li key={section.title} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-fg-muted flex min-w-0 items-baseline gap-2 text-sm">
                <BookOpen
                  className="text-fg-subtle size-3.5 shrink-0 translate-y-0.5"
                  aria-hidden
                />
                {section.url ? (
                  <a
                    href={section.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent-text hover:underline"
                  >
                    {section.title}
                  </a>
                ) : (
                  section.title
                )}
              </span>
              <span className="flex flex-wrap gap-1">
                {section.topics.map((id) => (
                  <Link
                    key={id}
                    to={`/learn/${id.toLowerCase()}`}
                    className="text-fg-subtle hover:text-accent-text font-mono text-xs"
                  >
                    {id}
                  </Link>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="text-fg-subtle mt-4 text-xs">License: {source.license}</div>
    </li>
  );
}

function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'rounded-full border px-3 py-1 text-sm transition-colors',
            value === option.id
              ? 'border-accent/40 bg-accent-soft text-accent-text'
              : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  useDocumentTitle('Library');
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [access, setAccess] = useState<LibraryAccess | 'all'>('all');
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const { hash } = useLocation();

  // /library#<id> (from search) scrolls to that source.
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);

  const counts = useMemo(
    () => ({
      open: LIBRARY.filter((s) => s.access === 'open').length,
      free: LIBRARY.filter((s) => s.access === 'free').length,
      paid: LIBRARY.filter((s) => s.access === 'paid').length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    const kinds = KIND_FILTERS.find((k) => k.id === kind)?.kinds ?? [];
    return LIBRARY.filter((source) => {
      if (kinds.length > 0 && !kinds.includes(source.kind)) return false;
      if (access !== 'all' && source.access !== access) return false;
      if (domain && !source.domains.includes(domain)) return false;
      if (!deferred) return true;
      return (
        source.title.toLowerCase().includes(deferred) ||
        source.publisher.toLowerCase().includes(deferred) ||
        (source.authors ?? []).some((a) => a.toLowerCase().includes(deferred)) ||
        source.why.toLowerCase().includes(deferred)
      );
    }).sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.title.localeCompare(b.title),
    );
  }, [deferred, domain, kind, access]);

  return (
    <PageContainer width="default">
      <PageHeader
        eyebrow="Library"
        title="Textbooks, standards and open references"
        description={`${LIBRARY.length} sources mapped to the topics they teach: ${counts.open} openly licensed, ${counts.free} free to read online, and ${counts.paid} current-edition books available to buy or through a college library. Every lesson page lists its readings, down to the chapter where we could verify one.`}
      />

      <div className="mt-6 space-y-3">
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
              placeholder="Search titles, authors and publishers"
              aria-label="Search the library"
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
        <FilterPills
          label="Kind of source"
          options={KIND_FILTERS}
          value={kind}
          onChange={setKind}
        />
        <FilterPills label="Access" options={ACCESS_FILTERS} value={access} onChange={setAccess} />
      </div>

      <p className="text-fg-subtle mt-4 text-xs" role="status">
        {filtered.length === LIBRARY.length
          ? `${LIBRARY.length} sources`
          : `${filtered.length} of ${LIBRARY.length} sources`}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={Library} title="No sources match">
            Clear a filter or try a shorter search.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {filtered.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </ul>
      )}

      <p className="text-fg-subtle mt-10 text-xs leading-relaxed">
        Editions, years and licenses were checked against each publisher&rsquo;s own page. Paid
        books are listed for reference only; CyberLab never reproduces their text. To add your
        course textbook, see the{' '}
        <a
          href={`${SITE.repoUrl}/blob/${SITE.contentBranch}/docs/KNOWLEDGE_BASE.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          knowledge base guide
        </a>
        .
      </p>
    </PageContainer>
  );
}
