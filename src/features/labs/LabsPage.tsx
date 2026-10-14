import { ArrowRight, Clock, Hammer, ShieldCheck, Target } from 'lucide-react';
import { Link } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { DifficultyBadge, ExecutionBadge } from '@/components/ui/badges';
import { Badge, Callout, Card, PageHeader } from '@/components/ui/primitives';
import { getTopic } from '@/content/catalog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { LABS } from '@/labs/registry';
import type { LabDefinition } from '@/labs/types';
import { cn } from '@/lib/cn';

import { isLabAvailable } from './labStatus';

function LabCard({ lab }: { lab: LabDefinition }) {
  const available = isLabAvailable(lab);
  const Icon = lab.icon;
  return (
    <Card className={cn('flex h-full flex-col p-5', available && 'hover:border-line-strong')}>
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl border',
            available
              ? 'border-accent/30 bg-accent-soft text-accent-text'
              : 'border-line bg-surface-2 text-fg-subtle',
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        {available ? (
          <Badge tone="success" icon={<ShieldCheck className="size-3" aria-hidden />}>
            Ready
          </Badge>
        ) : (
          <Badge tone="neutral" icon={<Hammer className="size-3" aria-hidden />}>
            In development
          </Badge>
        )}
      </div>

      <h2 className="text-fg mt-4 text-lg leading-snug font-semibold">{lab.title}</h2>
      <p className="text-fg-muted mt-1.5 text-sm leading-relaxed">{lab.tagline}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={lab.difficulty} />
        <ExecutionBadge mode={lab.mode} />
      </div>

      <div className="text-fg-subtle mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden /> About {lab.estimatedMinutes} min
        </span>
        {lab.challenges.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Target className="size-3.5" aria-hidden /> {lab.challenges.length} challenges
          </span>
        )}
        <span>{lab.engine}</span>
      </div>

      <div className="mt-4">
        <div className="text-fg-subtle mb-1.5 text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">
          Lessons
        </div>
        <ul className="space-y-1">
          {lab.topicIds.map((id) => (
            <li key={id}>
              <Link
                to={`/learn/${id.toLowerCase()}`}
                className="text-fg-muted hover:text-accent-text text-sm transition-colors"
              >
                <span className="text-fg-subtle mr-1.5 font-mono text-xs">{id}</span>
                {getTopic(id)?.title ?? id}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-5">
        {available ? (
          <ButtonLink to={`/labs/${lab.id}`} variant="primary" className="w-full justify-center">
            Open lab <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        ) : (
          <p className="text-fg-subtle text-xs leading-relaxed">
            This lab is being built. Its lessons are ready to read now, and each one includes an
            exercise you can do without the lab.
          </p>
        )}
      </div>
    </Card>
  );
}

export default function LabsPage() {
  useDocumentTitle('Labs');
  const ready = LABS.filter(isLabAvailable).length;
  const sorted = [...LABS].sort(
    (a, b) =>
      Number(isLabAvailable(b)) - Number(isLabAvailable(a)) || a.title.localeCompare(b.title),
  );
  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Labs"
        title="Run the attack, then build the defense"
        description={`Each lab is a small, fictional system that runs entirely inside your browser, so you can try a real technique safely and then fix it. ${ready} of ${LABS.length} labs are ready; the rest are being built.`}
      />
      <Callout tone="warning" title="Practice only here" className="mt-6">
        <p>
          The labs never touch the internet or any real system. Using these techniques on systems
          you do not own or have written permission to test is illegal in most places, including
          under the US Computer Fraud and Abuse Act.
        </p>
      </Callout>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((lab) => (
          <LabCard key={lab.id} lab={lab} />
        ))}
      </div>
    </PageContainer>
  );
}
