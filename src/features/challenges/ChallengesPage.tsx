import { FlaskConical, Hammer, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { Badge, EmptyState, PageHeader } from '@/components/ui/primitives';
import { isLabAvailable } from '@/features/labs/labStatus';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ChallengeCard } from '@/labs/components/ChallengeCard';
import { CHALLENGES, LABS } from '@/labs/registry';
import { cn } from '@/lib/cn';
import { challengeCompletion, useProgress } from '@/lib/progress';

type Filter = 'all' | 'open' | 'solved';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Not solved yet' },
  { id: 'solved', label: 'Solved' },
];

export default function ChallengesPage() {
  useDocumentTitle('Challenges');
  const progress = useProgress();
  const [filter, setFilter] = useState<Filter>('all');
  const { hash } = useLocation();

  // /challenges#<id> (from search) scrolls to that challenge.
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);
  const solvedCount = CHALLENGES.filter((c) => progress.challenges[c.id]?.solvedAt).length;
  const points = CHALLENGES.filter((c) => progress.challenges[c.id]?.solvedAt).reduce(
    (n, c) => n + c.points,
    0,
  );

  const labs = LABS.filter((lab) => lab.challenges.length > 0);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Challenges"
        title="Prove it in the lab"
        description={`${CHALLENGES.length} challenges that check your work: find the flag by doing the attack, answer what you observed, or ship the fix. Hints unlock one at a time, and the record shows whether you solved a challenge on your own or with support.`}
        actions={
          <div className="border-line bg-surface rounded-xl border px-4 py-2 text-right">
            <div className="text-fg text-lg font-semibold tabular-nums">
              {solvedCount} / {CHALLENGES.length}
            </div>
            <div className="text-fg-subtle text-xs">solved · {points} points</div>
          </div>
        }
      />

      <div role="group" aria-label="Show" className="mt-6 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              filter === f.id
                ? 'border-accent/40 bg-accent-soft text-accent-text'
                : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {labs.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Target} title="No challenges yet">
            Challenges arrive with each lab.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {labs.map((lab) => {
            const available = isLabAvailable(lab);
            const challenges = lab.challenges.filter((c) => {
              const solved = challengeCompletion(progress.challenges[c.id]);
              if (filter === 'solved') return solved === 'independent' || solved === 'with-support';
              if (filter === 'open') return solved !== 'independent' && solved !== 'with-support';
              return true;
            });
            if (challenges.length === 0) return null;
            return (
              <section key={lab.id} aria-labelledby={`lab-${lab.id}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id={`lab-${lab.id}`}
                    className="text-fg flex items-center gap-2 text-lg font-semibold tracking-tight"
                  >
                    <lab.icon className="text-fg-subtle size-5" aria-hidden />
                    {lab.title}
                  </h2>
                  {available ? (
                    <Link
                      to={`/labs/${lab.id}`}
                      className="text-accent-text inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                    >
                      <FlaskConical className="size-4" aria-hidden /> Open the lab
                    </Link>
                  ) : (
                    <Badge tone="neutral" icon={<Hammer className="size-3" aria-hidden />}>
                      Lab in development
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {challenges.map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
