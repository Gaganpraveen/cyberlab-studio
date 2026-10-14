import { BookOpen, FlaskConical, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PageContainer } from '@/components/layout/AppShell';
import { Badge, inputClasses, PageHeader } from '@/components/ui/primitives';
import { DOMAINS, TOPICS } from '@/content/catalog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

import { CATALOG_SUMMARY, domainStats, topicStatus } from './catalogStats';
import { TopicCard } from './TopicCard';

export default function LearnPage() {
  useDocumentTitle('Topic map');
  const [query, setQuery] = useState('');
  const [readyOnly, setReadyOnly] = useState(false);

  const normalized = query.trim().toLowerCase();

  const matches = useMemo(() => {
    return TOPICS.filter((topic) => {
      if (readyOnly && !topicStatus(topic.id).hasLesson) return false;
      if (!normalized) return true;
      return (
        topic.id.toLowerCase().includes(normalized) ||
        topic.title.toLowerCase().includes(normalized) ||
        topic.activity.toLowerCase().includes(normalized) ||
        topic.domainTitle.toLowerCase().includes(normalized)
      );
    });
  }, [normalized, readyOnly]);

  const byDomain = useMemo(() => {
    const map = new Map<string, typeof matches>();
    for (const topic of matches) {
      const list = map.get(topic.domainId) ?? [];
      list.push(topic);
      map.set(topic.domainId, list);
    }
    return map;
  }, [matches]);

  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Topic map"
        title="The whole field, one map"
        description={`${CATALOG_SUMMARY.topics} topics across ${CATALOG_SUMMARY.domains} domains. ${CATALOG_SUMMARY.lessons} have full lessons today; the rest show what is coming. Topics with a flask have a hands-on lab.`}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter topics, e.g. phishing, injection, TLS…"
            className={`${inputClasses} pl-9`}
            aria-label="Filter topics"
          />
        </div>
        <label className="text-fg-muted flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={readyOnly}
            onChange={(e) => setReadyOnly(e.target.checked)}
            className="accent-accent size-4"
          />
          Ready lessons only
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-fg-muted inline-flex items-center gap-1.5">
          <BookOpen className="text-success size-3.5" aria-hidden /> Lesson ready
        </span>
        <span className="text-fg-muted inline-flex items-center gap-1.5">
          <FlaskConical className="text-accent size-3.5" aria-hidden /> Hands-on lab
        </span>
        {normalized && (
          <span className="text-fg-subtle" role="status">
            {matches.length} {matches.length === 1 ? 'topic' : 'topics'}
          </span>
        )}
      </div>

      <div className="mt-8 space-y-10">
        {DOMAINS.map((domain) => {
          const topics = byDomain.get(domain.id);
          if (!topics || topics.length === 0) return null;
          const stats = domainStats(domain.id);
          return (
            <section key={domain.id} aria-labelledby={`domain-${domain.id}`}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  id={`domain-${domain.id}`}
                  className="text-fg flex items-center gap-2.5 text-lg font-semibold tracking-tight"
                >
                  <span className="text-fg-subtle font-mono text-sm">{domain.id}</span>
                  {domain.title}
                </h2>
                <Badge tone={stats.ready > 0 ? 'accent' : 'neutral'}>
                  {stats.ready} of {stats.total} ready
                </Badge>
              </div>
              <p className="text-fg-muted mb-4 max-w-3xl text-sm">{domain.description}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {topics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </PageContainer>
  );
}
