import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  GraduationCap,
  Library,
  Map,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { Link } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { Markdown } from '@/components/markdown/Markdown';
import { ButtonLink } from '@/components/ui/Button';
import { ExecutionBadge } from '@/components/ui/badges';
import { Card, ProgressBar } from '@/components/ui/primitives';

import { getLesson, LESSONS } from '@/content/lessons';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CHALLENGES, LABS } from '@/labs/registry';
import { cn } from '@/lib/cn';
import { useProgress } from '@/lib/progress';

import { CATALOG_SUMMARY } from '../learn/catalogStats';

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

export default function HomePage() {
  useDocumentTitle();
  const progress = useProgress();
  const completedLessons = Object.values(progress.lessons).filter((l) => l.completedAt).length;
  const solvedChallenges = Object.values(progress.challenges).filter((c) => c.solvedAt).length;

  const featuredLabs = LABS.slice(0, 3);
  const quickLinks = [
    {
      to: '/learn',
      icon: Map,
      title: 'Topic map',
      text: `${CATALOG_SUMMARY.topics} topics, ${CATALOG_SUMMARY.domains} domains`,
    },
    {
      to: '/labs',
      icon: FlaskConical,
      title: 'Hands-on labs',
      text: `${LABS.length} labs you run in your browser`,
    },
    {
      to: '/challenges',
      icon: Target,
      title: 'Challenges',
      text: `${CHALLENGES.length} graded challenges with hints`,
    },
    {
      to: '/library',
      icon: Library,
      title: 'Library',
      text: 'Textbooks, standards and open references',
    },
  ];

  return (
    <PageContainer width="wide">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-12 md:px-12 md:py-16">
        <div
          className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--c-accent-soft), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative max-w-2xl">
          <div className="text-accent-text mb-4 inline-flex items-center gap-2 text-sm font-medium">
            <GraduationCap className="size-4" aria-hidden />
            Learn cybersecurity by doing it
          </div>
          <h1 className="text-fg text-[2.25rem] leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl">
            Read the concept. Run the attack. Build the defense.
          </h1>
          <p className="text-fg-muted mt-4 text-lg leading-relaxed text-pretty">
            CyberLab Studio is one place to learn cybersecurity: linked lessons, hands-on labs where
            real attacks run safely inside your browser, and challenges that check your work. Built
            for college courses.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink to="/learn" variant="primary" size="lg">
              <Map className="size-5" aria-hidden /> Explore the topic map
            </ButtonLink>
            <ButtonLink to="/labs" variant="secondary" size="lg">
              <FlaskConical className="size-5" aria-hidden /> Try a lab
            </ButtonLink>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-10 gap-y-4">
            <Stat value={CATALOG_SUMMARY.topics} label="Topics mapped" />
            <Stat value={CATALOG_SUMMARY.lessons} label="Lessons ready" />
            <Stat value={LABS.length} label="Hands-on labs" />
            <Stat value={CHALLENGES.length} label="Challenges" />
          </div>
        </div>
      </section>

      {(completedLessons > 0 || solvedChallenges > 0) && (
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
                  max={LESSONS.length}
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
                  max={CHALLENGES.length}
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
      )}

      <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to}>
            <Card interactive className="h-full p-5">
              <link.icon className="text-accent size-6" aria-hidden />
              <h3 className="text-fg mt-3 font-semibold">{link.title}</h3>
              <p className="text-fg-muted mt-1 text-sm">{link.text}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-fg text-xl font-semibold tracking-tight">Start with a lab</h2>
            <p className="text-fg-muted mt-1 text-sm">
              Each lab is a complete attack-and-defense story you finish in one sitting.
            </p>
          </div>
          <Link to="/labs" className="text-accent-text hidden text-sm hover:underline sm:inline">
            All labs
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {featuredLabs.map((lab) => (
            <Link key={lab.id} to={`/labs/${lab.id}`} className="group">
              <Card interactive className="flex h-full flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="bg-surface-2 border-line flex size-10 items-center justify-center rounded-xl border">
                    <lab.icon className="text-accent-text size-5" aria-hidden />
                  </span>
                  <ExecutionBadge mode={lab.mode} />
                </div>
                <h3 className="text-fg group-hover:text-accent-text mt-4 font-semibold">
                  {lab.title}
                </h3>
                <p className="text-fg-muted mt-1.5 flex-1 text-sm leading-relaxed">{lab.tagline}</p>
                <span className="text-fg-subtle mt-4 inline-flex items-center gap-1 text-xs">
                  {lab.estimatedMinutes} min · {lab.challenges.length} challenges
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <HowItWorks
          icon={BookOpen}
          title="1. Learn the concept"
          text="Short, linked lessons explain how each attack and defense works, grounded in open textbooks and standards."
        />
        <HowItWorks
          icon={FlaskConical}
          title="2. Run it safely"
          text="Labs run entirely in your browser. Real attacks hit a target that only exists in your tab, never a real system."
        />
        <HowItWorks
          icon={ShieldCheck}
          title="3. Prove the defense"
          text="Fix the code or the configuration, then re-run the attack and watch it fail. Challenges check your work."
        />
      </section>

      <section className="border-line bg-surface mt-6 rounded-2xl border px-5 py-4">
        <Markdown compact>
          {
            '> [!ETHICS] You are learning offensive techniques so you can defend systems. Only ever use them on systems you own or have explicit written permission to test. Everything in these labs is fictional and contained to your browser.'
          }
        </Markdown>
      </section>
    </PageContainer>
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
    <div className={cn('bg-surface border-line rounded-2xl border p-5')}>
      <Icon className="text-accent size-6" aria-hidden />
      <h3 className="text-fg mt-3 font-semibold">{title}</h3>
      <p className="text-fg-muted mt-1.5 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
