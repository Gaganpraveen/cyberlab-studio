import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { Badge, Callout, EmptyState, inputClasses, PageHeader } from '@/components/ui/primitives';
import { ATTACK_CATEGORIES, ATTACKS, getAttack } from '@/content/attacks';
import { getTopic } from '@/content/catalog';
import type { Attack, AttackCategory } from '@/content/schema';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getLab } from '@/labs/registry';
import { cn } from '@/lib/cn';

const CATEGORY_ORDER = Object.keys(ATTACK_CATEGORIES) as AttackCategory[];

function attackUrl(id: string): string {
  const [technique, sub] = id.split('.');
  return `https://attack.mitre.org/techniques/${technique}/${sub ? `${sub}/` : ''}`;
}

function cweUrl(id: string): string {
  return `https://cwe.mitre.org/data/definitions/${id.replace('CWE-', '')}.html`;
}

function capecUrl(id: string): string {
  return `https://capec.mitre.org/data/definitions/${id.replace('CAPEC-', '')}.html`;
}

// The 2026 LLM Top 10 is published as one file per risk; genai.owasp.org's
// llm-top-10 page still presents the 2025 numbering.
const LLM_2026_FILES: Record<string, string> = {
  LLM01: 'LLM01_PromptInjection',
  LLM02: 'LLM02_SensitiveInformationDisclosure',
  LLM03: 'LLM03_ExcessiveAgency',
  LLM04: 'LLM04_SupplyChain',
  LLM05: 'LLM05_DataModelPoisoning',
  LLM06: 'LLM06_UnboundedConsumption',
  LLM07: 'LLM07_Misinformation',
  LLM08: 'LLM08_HiddenContextExposure',
  LLM09: 'LLM09_VectorAndEmbeddingWeaknesses',
  LLM10: 'LLM10_ImproperOutputHandling',
};

function owaspUrl(id: string): string {
  if (id.startsWith('API')) return 'https://owasp.org/API-Security/';
  if (id.startsWith('LLM')) {
    const [risk = '', year] = id.split(':');
    const file = year === '2026' ? LLM_2026_FILES[risk] : undefined;
    return file
      ? `https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/${file}.md`
      : 'https://genai.owasp.org/llm-top-10/';
  }
  return 'https://owasp.org/Top10/';
}

function IdLinks({
  label,
  ids,
  href,
}: {
  label: string;
  ids: string[];
  href: (id: string) => string;
}) {
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <dt className="text-fg-subtle w-24 shrink-0 text-xs">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <a
            key={id}
            href={href(id)}
            target="_blank"
            rel="noopener noreferrer"
            className="border-line text-fg-muted hover:text-fg hover:border-line-strong inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono text-xs transition-colors"
          >
            {id}
            <ArrowUpRight className="size-3" aria-hidden />
          </a>
        ))}
      </dd>
    </div>
  );
}

function Standards({ attack }: { attack: Attack }) {
  const any =
    attack.attack.length + attack.cwe.length + attack.capec.length + attack.owasp.length > 0;
  if (!any) return null;
  return (
    <dl className="space-y-1.5">
      <IdLinks label="MITRE ATT&CK" ids={attack.attack} href={attackUrl} />
      <IdLinks label="CWE" ids={attack.cwe} href={cweUrl} />
      <IdLinks label="CAPEC" ids={attack.capec} href={capecUrl} />
      <IdLinks label="OWASP" ids={attack.owasp} href={owaspUrl} />
    </dl>
  );
}

function AttackDetail({ attack }: { attack: Attack }) {
  useDocumentTitle(`${attack.name} · Attacks`);
  const category = ATTACK_CATEGORIES[attack.category];
  const siblings = ATTACKS.filter((a) => a.category === attack.category && a.id !== attack.id);
  return (
    <PageContainer width="narrow">
      <Link
        to="/attacks"
        className="text-fg-subtle hover:text-fg mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden /> Attacks A to Z
      </Link>
      <article>
        <Badge tone="neutral">{category.label}</Badge>
        <h1 className="text-fg mt-3 text-[2rem] leading-tight font-semibold tracking-tight text-balance">
          {attack.name}
        </h1>
        {attack.aliases.length > 0 && (
          <p className="text-fg-subtle mt-2 text-sm">Also called {attack.aliases.join(', ')}</p>
        )}
        <p className="text-fg mt-5 text-lg leading-relaxed text-pretty">{attack.summary}</p>

        <section className="mt-8" aria-labelledby="defenses">
          <h2
            id="defenses"
            className="text-fg mb-3 flex items-center gap-2 text-base font-semibold"
          >
            <ShieldCheck className="text-success size-4" aria-hidden /> Defenses
          </h2>
          <ul className="space-y-1.5">
            {attack.defenses.map((defense) => (
              <li key={defense} className="text-fg-muted flex gap-2 text-sm">
                <span className="bg-success mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
                {defense}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="where-taught">
          <h2
            id="where-taught"
            className="text-fg mb-3 flex items-center gap-2 text-base font-semibold"
          >
            <BookOpen className="text-fg-subtle size-4" aria-hidden /> Where it is taught
          </h2>
          <ul className="space-y-1.5">
            {attack.topics.map((id) => (
              <li key={id}>
                <Link
                  to={`/learn/${id.toLowerCase()}`}
                  className="text-fg-muted hover:text-accent-text text-sm transition-colors"
                >
                  <span className="text-fg-subtle mr-2 font-mono text-xs">{id}</span>
                  {getTopic(id)?.title ?? id}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {attack.labs.length > 0 && (
          <section className="mt-8" aria-labelledby="practice">
            <h2
              id="practice"
              className="text-fg mb-3 flex items-center gap-2 text-base font-semibold"
            >
              <FlaskConical className="text-accent-text size-4" aria-hidden /> Practice it
            </h2>
            <div className="flex flex-wrap gap-2">
              {attack.labs.map((id) => (
                <ButtonLink key={id} to={`/labs/${id}`} variant="secondary" size="sm">
                  {getLab(id)?.title ?? id}
                </ButtonLink>
              ))}
            </div>
          </section>
        )}

        {attack.attack.length + attack.cwe.length + attack.capec.length + attack.owasp.length >
          0 && (
          <section className="mt-8" aria-labelledby="standards">
            <h2 id="standards" className="text-fg mb-3 text-base font-semibold">
              Standard identifiers
            </h2>
            <Standards attack={attack} />
          </section>
        )}

        {siblings.length > 0 && (
          <section className="mt-10" aria-labelledby="same-category">
            <h2 id="same-category" className="text-fg mb-3 text-base font-semibold">
              More {category.label.toLowerCase()} attacks
            </h2>
            <div className="flex flex-wrap gap-2">
              {siblings.map((a) => (
                <Link
                  key={a.id}
                  to={`/attacks/${a.id}`}
                  className="border-line bg-surface hover:border-line-strong hover:text-fg text-fg-muted inline-flex rounded-full border px-3 py-1 text-sm transition-colors"
                >
                  {a.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </PageContainer>
  );
}

function AttackRow({ attack }: { attack: Attack }) {
  return (
    <li>
      <Link
        to={`/attacks/${attack.id}`}
        className="border-line bg-surface hover:border-line-strong group flex h-full flex-col rounded-xl border p-4 transition-colors"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="text-fg group-hover:text-accent-text font-medium">{attack.name}</span>
          {attack.labs.length > 0 && (
            <FlaskConical
              className="text-accent-text mt-0.5 size-4 shrink-0"
              aria-label="Has a lab"
            />
          )}
        </span>
        <span className="text-fg-muted mt-1.5 line-clamp-3 text-sm leading-relaxed">
          {attack.summary}
        </span>
        <span className="mt-auto flex flex-wrap gap-1 pt-3">
          {attack.topics.slice(0, 3).map((id) => (
            <span key={id} className="text-fg-subtle font-mono text-[0.6875rem]">
              {id}
            </span>
          ))}
          {[...attack.attack, ...attack.cwe].slice(0, 2).map((id) => (
            <span key={id} className="text-fg-subtle font-mono text-[0.6875rem]">
              · {id}
            </span>
          ))}
        </span>
      </Link>
    </li>
  );
}

function AttackIndex() {
  useDocumentTitle('Attacks A to Z');
  const [query, setQuery] = useState('');
  const [params] = useSearchParams();
  const [category, setCategory] = useState<AttackCategory | 'all'>(() => {
    const requested = params.get('category');
    return requested && requested in ATTACK_CATEGORIES ? (requested as AttackCategory) : 'all';
  });
  const [labsOnly, setLabsOnly] = useState(false);
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const filtered = useMemo(
    () =>
      ATTACKS.filter((a) => {
        if (category !== 'all' && a.category !== category) return false;
        if (labsOnly && a.labs.length === 0) return false;
        if (!deferred) return true;
        return (
          a.name.toLowerCase().includes(deferred) ||
          a.aliases.some((x) => x.toLowerCase().includes(deferred)) ||
          a.summary.toLowerCase().includes(deferred) ||
          [...a.attack, ...a.cwe, ...a.capec, ...a.owasp].some((id) =>
            id.toLowerCase().includes(deferred),
          )
        );
      }),
    [deferred, category, labsOnly],
  );

  const counts = useMemo(() => {
    const map = new Map<AttackCategory, number>();
    for (const a of ATTACKS) map.set(a.category, (map.get(a.category) ?? 0) + 1);
    return map;
  }, []);

  if (ATTACKS.length === 0) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Attacks A to Z"
          title="Every major attack, mapped"
          description="Each attack type with what it is, how to defend against it, the lessons that teach it, and its MITRE ATT&CK, CWE, CAPEC and OWASP identifiers."
        />
        <div className="mt-8">
          <EmptyState icon={ShieldAlert} title="The attack index is being compiled">
            Every identifier is checked against MITRE and OWASP before it is listed.
          </EmptyState>
        </div>
      </PageContainer>
    );
  }

  const grouped = CATEGORY_ORDER.map((c) => ({
    category: c,
    attacks: filtered.filter((a) => a.category === c),
  })).filter((g) => g.attacks.length > 0);

  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Attacks A to Z"
        title="Every major attack, mapped"
        description={`${ATTACKS.length} attack types across ${counts.size} categories. Each one links to the lessons that teach it, the labs that practice it, and its MITRE ATT&CK, CWE, CAPEC and OWASP identifiers.`}
      />

      <Callout tone="info" className="mt-6">
        <p>
          These pages explain what each attack is and how to stop it, so you can recognize and
          defend against it. They are not instructions for attacking anyone.
        </p>
      </Callout>

      <div className="mt-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search attacks, aliases or ids like T1566 or CWE-89"
              aria-label="Search attacks"
              className={cn(inputClasses, 'pl-9')}
            />
          </div>
          <label className="text-fg-muted flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              checked={labsOnly}
              onChange={(e) => setLabsOnly(e.target.checked)}
              className="accent-accent size-4"
            />
            Has a lab
          </label>
        </div>
        <div role="group" aria-label="Category" className="flex flex-wrap gap-1.5">
          {(['all', ...CATEGORY_ORDER] as const).map((c) =>
            c === 'all' || counts.has(c) ? (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  category === c
                    ? 'border-accent/40 bg-accent-soft text-accent-text'
                    : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                )}
              >
                {c === 'all' ? 'All' : ATTACK_CATEGORIES[c].label}
                <span className="text-fg-subtle ml-1.5 text-xs tabular-nums">
                  {c === 'all' ? ATTACKS.length : counts.get(c)}
                </span>
              </button>
            ) : null,
          )}
        </div>
      </div>

      <p className="text-fg-subtle mt-4 text-xs" role="status">
        {filtered.length === ATTACKS.length
          ? `${ATTACKS.length} attacks`
          : `${filtered.length} of ${ATTACKS.length} attacks`}
      </p>

      {grouped.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={ShieldAlert} title="No attacks match">
            Clear a filter or try a shorter search.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-4 space-y-10">
          {grouped.map(({ category: c, attacks }) => (
            <section key={c} aria-labelledby={`category-${c}`}>
              <div className="mb-3">
                <h2 id={`category-${c}`} className="text-fg text-lg font-semibold tracking-tight">
                  {ATTACK_CATEGORIES[c].label}
                </h2>
                <p className="text-fg-muted text-sm">{ATTACK_CATEGORIES[c].description}</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {attacks.map((attack) => (
                  <AttackRow key={attack.id} attack={attack} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default function AttacksPage() {
  const { attackId } = useParams();
  if (!attackId) return <AttackIndex />;
  const attack = getAttack(attackId);
  if (!attack) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          icon={ShieldAlert}
          title="That attack isn’t in the index yet"
          action={<ButtonLink to="/attacks">Browse all attacks</ButtonLink>}
        />
      </PageContainer>
    );
  }
  return <AttackDetail key={attack.id} attack={attack} />;
}
