import {
  Accessibility,
  BookOpenCheck,
  Download,
  FlaskConical,
  GraduationCap,
  Lock,
  Map,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { Callout, PageHeader } from '@/components/ui/primitives';
import { CATALOG_SUMMARY } from '@/features/learn/catalogStats';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { LABS } from '@/labs/registry';
import { isDesktopApp } from '@/lib/desktop';
import { SITE } from '@/lib/site';

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-line grid gap-4 border-t py-8 md:grid-cols-[14rem_1fr]">
      <h2 className="text-fg flex items-start gap-2.5 text-base font-semibold">
        <span className="text-accent-text mt-0.5">{icon}</span>
        {title}
      </h2>
      <div className="text-fg-muted space-y-3 text-[0.9375rem] leading-relaxed [&_a]:link">
        {children}
      </div>
    </section>
  );
}

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export default function AboutPage() {
  useDocumentTitle('About and ethics');
  return (
    <PageContainer width="default">
      <PageHeader
        eyebrow="About and ethics"
        title="An open studio for learning security by doing it"
        description="CyberLab Studio brings the reading, the practice and the checking into one place for college cybersecurity courses: linked lessons, a textbook library, an attack index, and labs where real techniques run safely inside your browser."
      />

      <div className="mt-10">
        <Section icon={<Map className="size-4" aria-hidden />} title="What is here">
          <p>
            The curriculum covers {CATALOG_SUMMARY.domains} areas of security in{' '}
            {CATALOG_SUMMARY.topics} topics, from security goals and networks to malware, forensics,
            cloud, AI systems and research methods. Each topic has a lesson with objectives, worked
            examples, defenses, a short quiz and verified sources; terms link to the{' '}
            <Link to="/glossary">glossary</Link>; readings point into the{' '}
            <Link to="/library">library</Link>; and the <Link to="/attacks">attack index</Link> maps
            every major attack to the lessons that teach it.
          </p>
          <p>
            The topic list is a proposed roadmap that instructors adapt, not an accredited
            curriculum.
          </p>
        </Section>

        <Section
          icon={<GraduationCap className="size-4" aria-hidden />}
          title="Using it in a course"
        >
          <p>
            Assign lessons by topic id (for example WEB-05). Turn on presenter mode in the top bar
            to project a lesson or step through a sequence diagram in class. Students&rsquo;
            progress stays in their own browser; they can export it from the{' '}
            <Link to="/progress">Progress page</Link> to hand in as evidence of completed work, and
            the export records whether each challenge was solved independently or with hints.
          </p>
          <p>
            Lessons are plain Markdown files, so you can edit any of them in GitHub&rsquo;s editor
            or add your own. Every lesson page has an &ldquo;Edit this lesson&rdquo; link, and the{' '}
            <a href={`${SITE.repoUrl}/blob/${SITE.contentBranch}/docs/CONTENT_GUIDE.md`} {...ext}>
              content guide
            </a>{' '}
            explains the format.
          </p>
        </Section>

        <Section icon={<Scale className="size-4" aria-hidden />} title="Responsible use">
          <Callout
            tone="warning"
            title="Only test systems you own or have written permission to test"
          >
            <p>
              Unauthorized access to computers is a crime in the United States under the Computer
              Fraud and Abuse Act (18 U.S.C. 1030) and under similar laws in most countries. This
              page is not legal advice; ask your institution if you are unsure.
            </p>
          </Callout>
          <p>
            Lessons explain how attacks work so you can recognize, prevent and detect them, at the
            level of a university textbook. They do not include working exploit chains, weaponized
            payloads, malware or instructions for attacking real systems. Lesson FND-07 covers
            authorization, scope and disclosure before you start the labs.
          </p>
        </Section>

        <Section
          icon={<FlaskConical className="size-4" aria-hidden />}
          title="How the labs stay safe"
        >
          <p>
            The {LABS.length} labs target small fictional systems that run entirely inside your
            browser tab. They never accept a real URL, IP address or credential as a target, they
            use reserved names such as <code>.example</code> and documentation IP ranges, and they
            make no network requests to the systems they simulate.
          </p>
          <p>
            Every lab says honestly what runs: &ldquo;Real execution in your browser&rdquo; when the
            attack and the defense genuinely execute (for example real SQLite compiled to
            WebAssembly), or &ldquo;Deterministic simulation&rdquo; when the numbers come from a
            model rather than a measurement.
          </p>
        </Section>

        <Section
          icon={<BookOpenCheck className="size-4" aria-hidden />}
          title="How content is checked"
        >
          <p>
            Lessons are original explanations written from the sources they cite, and the content
            guide requires every cited source to be a real page that was opened and checked. Lessons
            drafted with AI assistance are labeled &ldquo;Draft: pending instructor review&rdquo;
            until an instructor reviews them. Library editions, years and licenses come from each
            publisher&rsquo;s own page, and attack identifiers come from MITRE and OWASP.
          </p>
          <p>
            Found a mistake?{' '}
            <a href={`${SITE.repoUrl}/issues/new/choose`} {...ext}>
              Report it on GitHub
            </a>{' '}
            or use the edit link on the lesson.
          </p>
        </Section>

        <Section icon={<Download className="size-4" aria-hidden />} title="Desktop app">
          <p>
            The same studio runs as a desktop app for Windows, macOS and Linux, with every lesson
            and lab built in, so it works on a projector laptop with no internet connection.{' '}
            {isDesktopApp ? (
              <>You are using it now. </>
            ) : SITE.desktopReleased ? (
              <>
                Download the installer for your computer from the{' '}
                <a href={SITE.releasesUrl} {...ext}>
                  latest release
                </a>
                .{' '}
              </>
            ) : (
              <>The installers will be published with the first release. </>
            )}
            Links to readings open in your usual browser.
          </p>
          {(isDesktopApp || SITE.desktopReleased) && (
            <p>
              The installers are not yet signed with an Apple or Microsoft certificate. On a Mac,
              right-click the app and choose Open the first time; on Windows, choose More info, then
              Run anyway.
            </p>
          )}
        </Section>

        <Section icon={<Lock className="size-4" aria-hidden />} title="Privacy">
          <p>
            There are no accounts, analytics or trackers. Settings and progress are saved only in
            your browser&rsquo;s local storage, and nothing you type in a lab leaves your device.
          </p>
        </Section>

        <Section icon={<Accessibility className="size-4" aria-hidden />} title="Accessibility">
          <p>
            The interface is designed to meet WCAG 2.2 AA: everything works with a keyboard,
            diagrams have text equivalents, color is never the only signal, motion can be reduced,
            and text can be enlarged in <Link to="/settings">Settings</Link>.
          </p>
        </Section>

        <Section
          icon={<ShieldCheck className="size-4" aria-hidden />}
          title="Open source and licenses"
        >
          <p>
            The source code is available under the MIT License, and the educational content under
            Creative Commons Attribution-ShareAlike 4.0. Bundled fonts use the SIL Open Font
            License. Third-party software and sources are listed in the{' '}
            <a href={`${SITE.repoUrl}/blob/${SITE.contentBranch}/NOTICE`} {...ext}>
              NOTICE
            </a>{' '}
            file.
          </p>
          <p>
            <a href={SITE.repoUrl} {...ext}>
              CyberLab Studio on GitHub
            </a>
          </p>
        </Section>
      </div>
    </PageContainer>
  );
}
