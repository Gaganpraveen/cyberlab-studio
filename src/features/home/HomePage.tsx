import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  GraduationCap,
  Map,
  PencilLine,
  Presentation,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { ExecutionBadge } from '@/components/ui/badges';
import { Badge, Callout, Card, ProgressBar } from '@/components/ui/primitives';
import { ATTACKS } from '@/content/attacks';
import { DOMAINS } from '@/content/catalog';
import { GLOSSARY } from '@/content/glossary';
import { getLesson, LESSONS } from '@/content/lessons';
import { LIBRARY } from '@/content/library';
import { isLabAvailable } from '@/features/labs/labStatus';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CHALLENGES, LABS } from '@/labs/registry';
import { useProgress } from '@/lib/progress';

import { CATALOG_SUMMARY, domainStats } from '../learn/catalogStats';
import { domainIcon } from '../learn/domainIcons';
import { SpotTheFake } from './SpotTheFake';

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="text-fg text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-fg-subtle text-xs">{label}</div>
    </div>
  );
}

function ContinueCard() {
  const progress = useProgress();
  const entries = Object.entries(progress.lessons)
    .filter(([, l]) => l.viewedAt && !l.completedAt)
    .sort((a, b) => (b[1].viewedAt ?? '').localeCompare(a[1].viewedAt ?? ''));
  const resumeId = entries[0]?.[0];
  const lesson = resumeId ? getLesson(resumeId) : undefined;
  if (!lesson) return null;
  return (
    <Card className="border-accent/30 bg-accent-soft p-5">
      <div className="text-accent-text mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        <Sparkles className="size-3.5" aria-hidden /> Continue where you left off
      </div>
      <Link to={`/learn/${lesson.topicId.toLowerCase()}`} className="group block">
        <h3 className="text-fg group-hover:text-accent-text text-lg font-semibold">
          {lesson.title}
        </h3>
        <p className="text-fg-muted mt-1 line-clamp-2 text-sm">{lesson.summary}</p>
        <span className="text-accent-text mt-2 inline-flex items-center gap-1 text-sm font-medium">
          Resume <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>
    </Card>
  );
}

function ProgressSummary() {
  const progress = useProgress();
  const completedLessons = Object.values(progress.lessons).filter((l) => l.completedAt).length;
  const solvedChallenges = Object.values(progress.challenges).filter((c) => c.solvedAt).length;
  const viewed = Object.values(progress.lessons).some((l) => l.viewedAt);
  if (!viewed && solvedChallenges === 0) return null;
  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2">
      <ContinueCard />
      <Card className="p-5">
        <div className="text-fg-subtle mb-3 text-xs font-semibold tracking-wide uppercase">
          Your progress
        </div>
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-fg-muted">Lessons completed</span>
              <span className="text-fg tabular-nums">
                {completedLessons} / {LESSONS.length}
              </span>
            </div>
            <ProgressBar
              value={completedLessons}
              max={Math.max(LESSONS.length, 1)}
              label="Lessons completed"
              tone="success"
            />
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-fg-muted">Challenges solved</span>
              <span className="text-fg tabular-nums">
                {solvedChallenges} / {CHALLENGES.length}
              </span>
            </div>
            <ProgressBar
              value={solvedChallenges}
              max={Math.max(CHALLENGES.length, 1)}
              label="Challenges solved"
            />
          </div>
        </div>
        <Link
          to="/progress"
          className="text-accent-text mt-4 inline-flex items-center gap-1 text-sm hover:underline"
        >
          See all progress <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </Card>
    </section>
  );
}

function AreaGrid() {
  return (
    <section className="mt-14" aria-labelledby="areas">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="areas" className="text-fg text-xl font-semibold tracking-tight">
            Explore by area
          </h2>
          <p className="text-fg-muted mt-1 text-sm">
            {CATALOG_SUMMARY.domains} areas, {CATALOG_SUMMARY.topics} topics, from the first
            principles to research methods.
          </p>
        </div>
        <Link to="/learn" className="text-accent-text hidden text-sm hover:underline sm:inline">
          Topic map
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DOMAINS.map((domain) => {
          const Icon = domainIcon(domain.id);
          const stats = domainStats(domain.id);
          return (
            <li key={domain.id}>
              <Link
                to={`/learn?domain=${domain.id}`}
                className="border-line bg-surface hover:border-line-strong hover:bg-surface-2/60 group flex h-full flex-col rounded-2xl border p-4 transition-colors"
              >
                <span className="flex items-center justify-between">
                  <Icon
                    className="text-fg-subtle group-hover:text-accent size-5 transition-colors"
                    aria-hidden
                  />
                  <span className="text-fg-subtle font-mono text-[0.6875rem]">{domain.id}</span>
                </span>
                <span className="text-fg mt-3 text-[0.9375rem] leading-snug font-medium">
                  {domain.title}
                </span>
                <span className="mt-auto pt-3">
                  <ProgressBar
                    value={stats.ready}
                    max={stats.total}
                    label={`${domain.title}: ${stats.ready} of ${stats.total} lessons ready`}
                    tone={stats.ready === stats.total ? 'success' : 'accent'}
                  />
                  <span className="text-fg-subtle mt-1.5 block text-xs tabular-nums">
                    {stats.ready} of {stats.total} lessons
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FeaturedLabs() {
  const labs = [...LABS]
    .sort((a, b) => Number(isLabAvailable(b)) - Number(isLabAvailable(a)))
    .slice(0, 3);
  return (
    <section className="mt-14" aria-labelledby="labs">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 id="labs" className="text-fg text-xl font-semibold tracking-tight">
            Start with a lab
          </h2>
          <p className="text-fg-muted mt-1 text-sm">
            Each lab is a complete attack-and-defense story you finish in one sitting.
          </p>
        </div>
        <Link to="/labs" className="text-accent-text hidden text-sm hover:underline sm:inline">
          All labs
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {labs.map((lab) => {
          const available = isLabAvailable(lab);
          const body = (
            <Card interactive={available} className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="bg-surface-2 border-line flex size-10 items-center justify-center rounded-xl border">
                  <lab.icon
                    className={available ? 'text-accent-text size-5' : 'text-fg-subtle size-5'}
                    aria-hidden
                  />
                </span>
                {available ? (
                  <ExecutionBadge mode={lab.mode} />
                ) : (
                  <Badge tone="neutral">In development</Badge>
                )}
              </div>
              <h3 className="text-fg group-hover:text-accent-text mt-4 font-semibold">
                {lab.title}
              </h3>
              <p className="text-fg-muted mt-1.5 flex-1 text-sm leading-relaxed">{lab.tagline}</p>
              <span className="text-fg-subtle mt-4 inline-flex items-center gap-1 text-xs">
                About {lab.estimatedMinutes} min
                {lab.challenges.length > 0 && ` · ${lab.challenges.length} challenges`}
              </span>
            </Card>
          );
          return available ? (
            <Link key={lab.id} to={`/labs/${lab.id}`} className="group">
              {body}
            </Link>
          ) : (
            <div key={lab.id}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof BookOpen;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-surface border-line rounded-2xl border p-5">
      <Icon className="text-accent size-6" aria-hidden />
      <h3 className="text-fg mt-3 font-semibold">{title}</h3>
      <p className="text-fg-muted mt-1.5 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function ForInstructors() {
  const items = [
    {
      icon: Presentation,
      title: 'Teach from it',
      text: 'Presenter mode enlarges everything for a projector, and diagrams step through one message at a time.',
    },
    {
      icon: PencilLine,
      title: 'Make it yours',
      text: 'Every lesson is a Markdown file you can edit on GitHub, and new lessons follow one short guide.',
    },
    {
      icon: Upload,
      title: 'Collect evidence',
      text: 'Students export their progress, which records whether each challenge was solved alone or with hints.',
    },
  ];
  return (
    <section
      className="border-line bg-surface mt-14 rounded-3xl border p-6 md:p-8"
      aria-labelledby="instructors"
    >
      <div className="text-accent-text mb-2 inline-flex items-center gap-2 text-sm font-medium">
        <GraduationCap className="size-4" aria-hidden /> For instructors
      </div>
      <h2 id="instructors" className="text-fg text-xl font-semibold tracking-tight">
        Built to run a course on
      </h2>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.title}>
            <item.icon className="text-fg-subtle size-5" aria-hidden />
            <h3 className="text-fg mt-2 font-medium">{item.title}</h3>
            <p className="text-fg-muted mt-1 text-sm leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
      <Link
        to="/about"
        className="text-accent-text mt-6 inline-flex items-center gap-1 text-sm hover:underline"
      >
        How CyberLab is built and checked <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  );
}

export default function HomePage() {
  useDocumentTitle();

  return (
    <PageContainer width="wide">
      <section className="border-line bg-surface relative overflow-hidden rounded-3xl border px-6 py-10 md:px-10 md:py-12">
        <div
          className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--c-accent-soft), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="max-w-2xl">
            <div className="text-accent-text mb-4 inline-flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="size-4" aria-hidden />
              Cybersecurity, learned by doing it
            </div>
            <h1 className="text-fg text-[2.25rem] leading-[1.08] font-semibold tracking-tight text-balance md:text-[3.25rem]">
              Read the concept. Run the attack. Build the defense.
            </h1>
            <p className="text-fg-muted mt-5 max-w-[60ch] text-lg leading-relaxed text-pretty">
              Linked lessons across the whole field, a library of textbooks and standards, and
              hands-on labs where real techniques run safely inside your browser. Built for college
              courses.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink to="/learn" variant="primary" size="lg">
                <Map className="size-5" aria-hidden /> Explore the topic map
              </ButtonLink>
              <ButtonLink to="/attacks" variant="secondary" size="lg">
                <ShieldAlert className="size-5" aria-hidden /> Attacks A to Z
              </ButtonLink>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-9 gap-y-4">
              <Stat value={CATALOG_SUMMARY.lessons} label="Lessons" />
              <Stat value={CATALOG_SUMMARY.topics} label="Topics mapped" />
              {ATTACKS.length > 0 && <Stat value={ATTACKS.length} label="Attack types" />}
              <Stat value={GLOSSARY.length} label="Glossary terms" />
              <Stat value={LIBRARY.length} label="Library sources" />
            </div>
          </div>
          <SpotTheFake />
        </div>
      </section>

      <ProgressSummary />
      <AreaGrid />
      <FeaturedLabs />

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        <HowItWorks
          icon={BookOpen}
          title="1. Learn the concept"
          text="Short, linked lessons explain how each attack and defense works, grounded in open textbooks and standards."
        />
        <HowItWorks
          icon={FlaskConical}
          title="2. Run it safely"
          text="Labs run entirely in your browser. Attacks hit a fictional target that only exists in your tab, never a real system."
        />
        <HowItWorks
          icon={ShieldCheck}
          title="3. Prove the defense"
          text="Fix the code or the configuration, then re-run the attack and watch it fail. Challenges check your work."
        />
      </section>

      <ForInstructors />

      <Callout tone="warning" title="Ethics and authorization" className="mt-6">
        You are learning offensive techniques so you can defend systems. Only ever use them on
        systems you own or have explicit written permission to test. Everything in these labs is
        fictional and contained to your browser.
      </Callout>
    </PageContainer>
  );
}
