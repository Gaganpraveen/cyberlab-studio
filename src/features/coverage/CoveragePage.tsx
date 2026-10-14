import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  Library,
  type LucideIcon,
  Map as MapIcon,
  ShieldAlert,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { Callout, Card, EmptyState, PageHeader, ProgressBar } from '@/components/ui/primitives';
import { ATTACK_CATEGORIES, ATTACKS, attacksForTopic } from '@/content/attacks';
import { DOMAINS, TOPICS, type TopicRecord } from '@/content/catalog';
import { GLOSSARY } from '@/content/glossary';
import { getLesson } from '@/content/lessons';
import { readingsForTopic } from '@/content/library';
import type { AttackCategory } from '@/content/schema';
import { isLabAvailable } from '@/features/labs/labStatus';
import { domainIcon } from '@/features/learn/domainIcons';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { LABS, labsForTopic } from '@/labs/registry';
import { cn } from '@/lib/cn';
import { SITE } from '@/lib/site';

interface TopicFacts {
  topic: TopicRecord;
  lesson: 'reviewed' | 'draft' | 'none';
  labsAvailable: number;
  labsInDevelopment: number;
  readings: number;
  attacks: number;
}

function factsFor(topic: TopicRecord): TopicFacts {
  const labs = labsForTopic(topic.id);
  const available = labs.filter(isLabAvailable).length;
  return {
    topic,
    lesson: getLesson(topic.id)?.status ?? 'none',
    labsAvailable: available,
    labsInDevelopment: labs.length - available,
    readings: readingsForTopic(topic.id).length,
    attacks: attacksForTopic(topic.id).length,
  };
}

type Lens = 'lessons' | 'labs' | 'readings' | 'attacks';
type Level = 0 | 1 | 2 | 3;

interface LensDefinition {
  id: Lens;
  label: string;
  icon: LucideIcon;
  /** How strongly a topic is covered, from nothing (0) to fully (3). */
  level: (f: TopicFacts) => Level;
  /** Whether the topic counts toward its area's total. */
  covered: (f: TopicFacts) => boolean;
  coveredLabel: string;
  legend: Array<{ level: Level; label: string }>;
}

const LENSES: LensDefinition[] = [
  {
    id: 'lessons',
    label: 'Lessons',
    icon: BookOpen,
    level: (f) => (f.lesson === 'reviewed' ? 3 : f.lesson === 'draft' ? 2 : 0),
    covered: (f) => f.lesson !== 'none',
    coveredLabel: 'with a lesson',
    legend: [
      { level: 3, label: 'Reviewed lesson' },
      { level: 2, label: 'Draft lesson' },
      { level: 0, label: 'Not written yet' },
    ],
  },
  {
    id: 'labs',
    label: 'Labs',
    icon: FlaskConical,
    level: (f) => (f.labsAvailable > 0 ? 3 : f.labsInDevelopment > 0 ? 1 : 0),
    covered: (f) => f.labsAvailable > 0,
    coveredLabel: 'with a lab',
    legend: [
      { level: 3, label: 'Lab available' },
      { level: 1, label: 'Lab in development' },
      { level: 0, label: 'No lab yet' },
    ],
  },
  {
    id: 'readings',
    label: 'Readings',
    icon: Library,
    level: (f) => Math.min(f.readings, 3) as Level,
    covered: (f) => f.readings >= 3,
    coveredLabel: 'with 3+ readings',
    legend: [
      { level: 3, label: '3 or more' },
      { level: 2, label: '2' },
      { level: 1, label: '1' },
      { level: 0, label: 'None yet' },
    ],
  },
  {
    id: 'attacks',
    label: 'Attacks',
    icon: ShieldAlert,
    level: (f) => (f.attacks >= 6 ? 3 : f.attacks >= 3 ? 2 : f.attacks >= 1 ? 1 : 0),
    covered: (f) => f.attacks > 0,
    coveredLabel: 'teaching an attack type',
    legend: [
      { level: 3, label: '6 or more' },
      { level: 2, label: '3 to 5' },
      { level: 1, label: '1 or 2' },
      { level: 0, label: 'None' },
    ],
  },
];

const LEVEL_CLASSES: Record<Level, string> = {
  0: 'border-dashed border-line-strong text-fg-subtle',
  1: 'border-accent-text/25 bg-accent-text/10 text-fg-muted',
  2: 'border-accent-text/45 bg-accent-text/25 text-fg',
  3: 'border-accent bg-accent text-on-accent',
};

const pad = (n: number) => String(n).padStart(2, '0');

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function describe(f: TopicFacts): string {
  const lesson =
    f.lesson === 'reviewed'
      ? 'reviewed lesson'
      : f.lesson === 'draft'
        ? 'draft lesson'
        : 'no lesson yet';
  const labs =
    f.labsAvailable + f.labsInDevelopment === 0
      ? 'no lab'
      : [
          f.labsAvailable && plural(f.labsAvailable, 'lab'),
          f.labsInDevelopment && `${f.labsInDevelopment} in development`,
        ]
          .filter(Boolean)
          .join(', ');
  return `${lesson}, ${labs}, ${plural(f.readings, 'reading')}, ${plural(f.attacks, 'attack type')}`;
}

function labsText(f: TopicFacts): string {
  if (f.labsAvailable + f.labsInDevelopment === 0) return 'None yet';
  return [
    f.labsAvailable && `${f.labsAvailable} available`,
    f.labsInDevelopment && `${f.labsInDevelopment} in development`,
  ]
    .filter(Boolean)
    .join(', ');
}

/** Details for the topic under the pointer or keyboard focus. */
function TopicPanel({
  facts,
  lens,
  total,
}: {
  facts?: TopicFacts;
  lens: LensDefinition;
  total: number;
}) {
  if (!facts) {
    return (
      <div className="animate-fade-in">
        <div className="text-fg-subtle text-xs font-semibold tracking-[0.1em] uppercase">
          {lens.label}
        </div>
        <p className="text-fg mt-2 text-2xl font-semibold tracking-tight tabular-nums">
          {total} <span className="text-fg-subtle text-base font-normal">of {TOPICS.length}</span>
        </p>
        <p className="text-fg-muted mt-1 text-sm leading-relaxed">
          topics {lens.coveredLabel}. Point at a square, or tab to it, to see that topic here.
        </p>
      </div>
    );
  }
  const rows: Array<[string, string]> = [
    [
      'Lesson',
      facts.lesson === 'reviewed'
        ? 'Reviewed by an instructor'
        : facts.lesson === 'draft'
          ? 'Draft, awaiting review'
          : 'Not written yet',
    ],
    ['Labs', labsText(facts)],
    ['Readings', facts.readings ? String(facts.readings) : 'None yet'],
    ['Attack types', String(facts.attacks)],
  ];
  return (
    <div key={facts.topic.id} className="animate-fade-in">
      <div className="text-fg-subtle font-mono text-xs">
        {facts.topic.id} · {facts.topic.domainTitle}
      </div>
      <p className="text-fg mt-1.5 text-base leading-snug font-semibold text-balance">
        {facts.topic.title}
      </p>
      <p className="text-fg-muted mt-1.5 text-sm leading-relaxed">{facts.topic.activity}</p>
      <dl className="border-line mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t pt-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-fg-subtle">{label}</dt>
            <dd className="text-fg-muted">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A segmented control whose highlight slides to the chosen option. */
function LensPicker({ value, onChange }: { value: Lens; onChange: (lens: Lens) => void }) {
  const refs = useRef(new Map<Lens, HTMLButtonElement>());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = refs.current.get(value);
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value]);

  return (
    <div
      role="radiogroup"
      aria-label="Color the map by"
      className="border-line bg-surface relative inline-flex max-w-full overflow-x-auto rounded-lg border p-1"
    >
      {pill && (
        <span
          aria-hidden
          className="bg-surface-3 absolute inset-y-1 rounded-md transition-[left,width] duration-300 ease-[var(--ease-out-soft)]"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {LENSES.map((lens) => (
        <button
          key={lens.id}
          ref={(el) => {
            if (el) refs.current.set(lens.id, el);
          }}
          type="button"
          role="radio"
          aria-checked={value === lens.id}
          onClick={() => onChange(lens.id)}
          className={cn(
            'relative inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
            value === lens.id ? 'text-fg font-medium' : 'text-fg-muted hover:text-fg',
          )}
        >
          <lens.icon className="size-3.5" aria-hidden />
          {lens.label}
        </button>
      ))}
    </div>
  );
}

function CoverageMatrix({ facts }: { facts: Map<string, TopicFacts[]> }) {
  const [lensId, setLensId] = useState<Lens>('lessons');
  const [active, setActive] = useState<TopicFacts>();
  const lens = LENSES.find((l) => l.id === lensId)!;
  const columns = Math.max(...DOMAINS.map((d) => d.topics.length));
  const total = [...facts.values()].flat().filter(lens.covered).length;

  return (
    <section className="mt-12" aria-labelledby="matrix-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="matrix-title" className="text-fg text-lg font-semibold tracking-tight">
            Every topic, area by area
          </h2>
          <p className="text-fg-muted mt-1 max-w-2xl text-sm leading-relaxed">
            Each square is one topic. Choose what the color shows, then open any square.
          </p>
        </div>
        <LensPicker value={lensId} onChange={setLensId} />
      </div>

      <Card className="p-3 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 overflow-x-auto">
            <table
              className="border-separate border-spacing-0"
              onMouseLeave={() => setActive(undefined)}
            >
              <caption className="sr-only">
                Topics in each area, colored by {lens.label.toLowerCase()}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="sr-only">
                    Area
                  </th>
                  {Array.from({ length: columns }, (_, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="text-fg-subtle pb-2 text-center font-mono text-[0.6875rem] font-normal"
                    >
                      <span className="sr-only">Topic </span>
                      {pad(i + 1)}
                    </th>
                  ))}
                  <th scope="col" className="hidden sm:table-cell">
                    <span className="sr-only">Topics {lens.coveredLabel}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {DOMAINS.map((domain, row) => {
                  const list = facts.get(domain.id) ?? [];
                  const covered = list.filter(lens.covered).length;
                  const Icon = domainIcon(domain.id);
                  return (
                    <tr key={domain.id}>
                      <th scope="row" className="py-0.5 pr-3 text-left font-normal sm:pr-5">
                        <Link
                          to={`/learn?domain=${domain.id}`}
                          className="text-fg-muted hover:text-fg flex items-center gap-2 text-sm transition-colors"
                        >
                          <Icon className="text-fg-subtle size-4 shrink-0" aria-hidden />
                          <span className="font-mono text-xs sm:hidden">{domain.id}</span>
                          <span className="hidden max-w-[17rem] truncate sm:inline">
                            {domain.title}
                          </span>
                        </Link>
                      </th>
                      {list.map((f, col) => {
                        const delay = (row + col) * 14;
                        return (
                          <td key={f.topic.id} className="p-[2px] sm:p-[3px]">
                            <Link
                              to={`/learn/${f.topic.id.toLowerCase()}`}
                              aria-label={`${f.topic.id} ${f.topic.title}: ${describe(f)}`}
                              onMouseEnter={() => setActive(f)}
                              onFocus={() => setActive(f)}
                              onBlur={() => setActive(undefined)}
                              className={cn(
                                'animate-fade-in flex size-7 items-center justify-center rounded-md border font-mono text-[0.625rem] sm:size-10 sm:text-[0.6875rem]',
                                'transition-[background-color,border-color,color,transform] duration-500 hover:scale-110 focus-visible:scale-110',
                                active?.topic.id === f.topic.id && 'ring-fg/70 ring-2',
                                LEVEL_CLASSES[lens.level(f)],
                              )}
                              style={{
                                animationDelay: `${(row * columns + col) * 5}ms`,
                                transitionDelay: `${delay}ms, ${delay}ms, ${delay}ms, 0ms`,
                              }}
                            >
                              {pad(f.topic.index)}
                            </Link>
                          </td>
                        );
                      })}
                      <td className="text-fg-subtle hidden py-0.5 pl-3 text-right text-xs whitespace-nowrap tabular-nums sm:table-cell">
                        {covered} / {list.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <aside
            className="border-line min-w-0 flex-1 lg:sticky lg:top-24 lg:border-l lg:pl-8"
            aria-label="Topic details"
            aria-live="polite"
          >
            <TopicPanel facts={active} lens={lens} total={total} />
            <div className="border-line mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4">
              {lens.legend.map((item) => (
                <span
                  key={item.label}
                  className="text-fg-muted inline-flex items-center gap-2 text-xs"
                >
                  <span
                    className={cn(
                      'size-3.5 shrink-0 rounded-[4px] border',
                      LEVEL_CLASSES[item.level],
                    )}
                    aria-hidden
                  />
                  {item.label}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </Card>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  progress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  progress?: { value: number; max: number };
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="text-fg-subtle flex items-center gap-2 text-xs font-semibold tracking-[0.1em] uppercase">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <div className="text-fg mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-fg-muted mt-1 text-sm leading-snug">{detail}</div>
      {progress && (
        <div className="mt-auto pt-4">
          <ProgressBar
            value={progress.value}
            max={progress.max}
            label={`${label}: ${progress.value} of ${progress.max}`}
          />
        </div>
      )}
    </Card>
  );
}

function AttackCoverage() {
  const categories = useMemo(() => {
    const byCategory = new Map<AttackCategory, typeof ATTACKS>();
    for (const attack of ATTACKS) {
      const list = byCategory.get(attack.category) ?? [];
      list.push(attack);
      byCategory.set(attack.category, list);
    }
    return (Object.keys(ATTACK_CATEGORIES) as AttackCategory[])
      .map((id) => {
        const attacks = byCategory.get(id) ?? [];
        return {
          id,
          ...ATTACK_CATEGORIES[id],
          total: attacks.length,
          taught: attacks.filter((a) => a.topics.some((t) => getLesson(t))).length,
          practiced: attacks.filter((a) => a.labs.length > 0).length,
        };
      })
      .filter((c) => c.total > 0);
  }, []);

  return (
    <section className="mt-12" aria-labelledby="attack-coverage">
      <h2 id="attack-coverage" className="text-fg text-lg font-semibold tracking-tight">
        Attack types by category
      </h2>
      <p className="text-fg-muted mt-1 mb-5 max-w-2xl text-sm leading-relaxed">
        How many attacks in the A to Z index each lesson set explains, and how many have a lab to
        practice the defense.
      </p>
      {categories.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="The attack index is being compiled">
          Each attack type will list the lessons and labs that cover it.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                to={`/attacks?category=${c.id}`}
                className="border-line bg-surface hover:border-line-strong hover:bg-surface-2/60 group flex h-full flex-col rounded-xl border p-4 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-fg font-medium">{c.label}</span>
                  <span className="text-fg-subtle shrink-0 text-xs tabular-nums">
                    {plural(c.total, 'type')}
                  </span>
                </div>
                <p className="text-fg-muted mt-1 line-clamp-2 text-sm leading-snug">
                  {c.description}
                </p>
                <div className="mt-auto pt-4">
                  <div
                    className="bg-surface-3 relative h-1.5 overflow-hidden rounded-full"
                    aria-hidden
                  >
                    <div
                      className="bg-accent-text/35 absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${(c.taught / c.total) * 100}%` }}
                    />
                    <div
                      className="bg-accent-text absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${(c.practiced / c.total) * 100}%` }}
                    />
                  </div>
                  <div className="text-fg-subtle mt-2 flex justify-between gap-3 text-xs">
                    <span>{c.taught} in a written lesson</span>
                    <span>{plural(c.practiced, 'with a lab', 'with labs')}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function CoveragePage() {
  useDocumentTitle('Coverage map');

  const facts = useMemo(() => {
    const map = new Map<string, TopicFacts[]>();
    for (const topic of TOPICS) {
      const list = map.get(topic.domainId) ?? [];
      list.push(factsFor(topic));
      map.set(topic.domainId, list);
    }
    return map;
  }, []);

  const all = [...facts.values()].flat();
  const withLesson = all.filter((f) => f.lesson !== 'none').length;
  const reviewed = all.filter((f) => f.lesson === 'reviewed').length;
  const withLab = all.filter((f) => f.labsAvailable > 0).length;
  const withReadings = all.filter((f) => f.readings >= 3).length;
  const labsAvailable = LABS.filter(isLabAvailable).length;
  const categories = new Set(ATTACKS.map((a) => a.category)).size;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Coverage"
        title="What the curriculum covers"
        description={`${TOPICS.length} topics across ${DOMAINS.length} areas of security, and how far each one has lessons, labs, readings and attack types behind it. It updates as lessons are written and reviewed.`}
        actions={
          <ButtonLink to="/learn" icon={<MapIcon className="size-4" aria-hidden />}>
            Topic map
          </ButtonLink>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={BookOpen}
          label="Lessons"
          value={`${withLesson}`}
          detail={`of ${TOPICS.length} topics; ${reviewed} reviewed by an instructor`}
          progress={{ value: withLesson, max: TOPICS.length }}
        />
        <Stat
          icon={FlaskConical}
          label="Labs"
          value={`${labsAvailable}`}
          detail={`ready to use, covering ${plural(withLab, 'topic')}${
            labsAvailable < LABS.length
              ? `; ${LABS.length - labsAvailable} more in development`
              : ''
          }`}
          progress={{ value: withLab, max: TOPICS.length }}
        />
        <Stat
          icon={ShieldAlert}
          label="Attack types"
          value={`${ATTACKS.length}`}
          detail={
            ATTACKS.length
              ? `in ${plural(categories, 'category', 'categories')}, each mapped to its lessons`
              : 'Index in progress'
          }
        />
        <Stat
          icon={Library}
          label="Readings"
          value={`${withReadings}`}
          detail={`of ${TOPICS.length} topics have three or more mapped readings`}
          progress={{ value: withReadings, max: TOPICS.length }}
        />
      </div>

      <CoverageMatrix facts={facts} />
      <AttackCoverage />

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <Callout tone="accent" title="Teaching one of the open topics?">
          <p>
            Lessons are Markdown files anyone can propose on GitHub. The{' '}
            <a
              href={`${SITE.repoUrl}/blob/${SITE.contentBranch}/docs/CONTENT_GUIDE.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              content guide
            </a>{' '}
            explains the format and the review steps.
          </p>
        </Callout>
        <Callout tone="info" title="Using a different textbook?">
          <p>
            Map its chapters to topics and every lesson page will list them. See the{' '}
            <a
              href={`${SITE.repoUrl}/blob/${SITE.contentBranch}/docs/KNOWLEDGE_BASE.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              knowledge base guide
            </a>
            , or browse the{' '}
            <Link to="/library" className="link">
              library
            </Link>{' '}
            and the{' '}
            <Link to="/glossary" className="link">
              {GLOSSARY.length} glossary terms
            </Link>
            .
          </p>
        </Callout>
      </section>

      <p className="mt-10">
        <Link
          to="/learn"
          className="text-accent-text inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          Browse every topic on the topic map <ArrowRight className="size-4" aria-hidden />
        </Link>
      </p>
    </PageContainer>
  );
}
