import { Command } from 'cmdk';
import {
  BookMarked,
  BookOpen,
  CornerDownLeft,
  FileText,
  FlaskConical,
  Library,
  Monitor,
  Moon,
  Presentation,
  Sun,
  Target,
} from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { type ReactNode, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';

import { Kbd } from '@/components/ui/primitives';
import { TOPICS } from '@/content/catalog';
import { GLOSSARY } from '@/content/glossary';
import { hasLesson } from '@/content/lessons';
import { LIBRARY } from '@/content/library';
import { CHALLENGES, LABS } from '@/labs/registry';
import { updateSettings, useSettings } from '@/lib/settings';

import { PRIMARY_NAV, SECONDARY_NAV } from './navigation';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    Boolean(target.closest('.cm-editor'))
  );
}

/** Ctrl/Cmd+K anywhere, or "/" when not typing, opens the palette. */
export function useCommandPaletteShortcut(open: () => void): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        open();
      } else if (event.key === '/' && !event.metaKey && !event.ctrlKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}

const itemClasses =
  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-muted ' +
  'aria-selected:bg-surface-3 aria-selected:text-fg data-[disabled=true]:opacity-50';

const groupClasses =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 ' +
  '[&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:font-semibold ' +
  '[&_[cmdk-group-heading]]:tracking-[0.1em] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-fg-subtle';

function Item({
  value,
  keywords,
  onSelect,
  icon,
  children,
  hint,
}: {
  value: string;
  keywords?: string[];
  onSelect: () => void;
  icon: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Command.Item value={value} keywords={keywords} onSelect={onSelect} className={itemClasses}>
      <span className="text-fg-subtle flex size-4 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="text-fg-subtle shrink-0 text-xs">{hint}</span>}
    </Command.Item>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const settings = useSettings();

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const topics = useMemo(
    () => [...TOPICS].sort((a, b) => Number(hasLesson(b.id)) - Number(hasLesson(a.id))),
    [],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="bg-surface border-line-strong shadow-elevated animate-rise-in fixed top-[12vh] left-1/2 z-50 w-[min(94vw,40rem)] -translate-x-1/2 overflow-hidden rounded-2xl border"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Search CyberLab Studio</DialogPrimitive.Title>
          <Command label="Search CyberLab Studio" loop>
            <div className="border-line flex items-center gap-2 border-b px-4">
              <Command.Input

                placeholder="Search topics, labs, challenges, terms, books…"
                className="text-fg placeholder:text-fg-subtle h-14 w-full bg-transparent text-base outline-none"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
              <Command.Empty className="text-fg-muted px-3 py-8 text-center text-sm">
                No matches. Try a topic like “phishing” or a term like “salt”.
              </Command.Empty>

              <Command.Group heading="Go to" className={groupClasses}>
                {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => (
                  <Item
                    key={item.to}
                    value={`page ${item.label}`}
                    keywords={[item.description]}
                    onSelect={() => go(item.to)}
                    icon={<item.icon className="size-4" />}
                    hint={item.description}
                  >
                    {item.label}
                  </Item>
                ))}
              </Command.Group>

              <Command.Group heading="Labs" className={groupClasses}>
                {LABS.map((lab) => (
                  <Item
                    key={lab.id}
                    value={`lab ${lab.title}`}
                    keywords={[lab.tagline, ...lab.topicIds]}
                    onSelect={() => go(`/labs/${lab.id}`)}
                    icon={<FlaskConical className="size-4" />}
                    hint={lab.mode === 'real' ? 'Real execution' : 'Simulation'}
                  >
                    {lab.title}
                  </Item>
                ))}
              </Command.Group>

              <Command.Group heading="Topics" className={groupClasses}>
                {topics.map((topic) => (
                  <Item
                    key={topic.id}
                    value={`topic ${topic.id} ${topic.title}`}
                    keywords={[topic.domainTitle, topic.activity]}
                    onSelect={() => go(`/learn/${topic.id.toLowerCase()}`)}
                    icon={
                      hasLesson(topic.id) ? (
                        <BookOpen className="size-4" />
                      ) : (
                        <FileText className="size-4" />
                      )
                    }
                    hint={hasLesson(topic.id) ? 'Lesson' : 'Coming soon'}
                  >
                    <span className="text-fg-subtle mr-2 font-mono text-xs">{topic.id}</span>
                    {topic.title}
                  </Item>
                ))}
              </Command.Group>

              {CHALLENGES.length > 0 && (
                <Command.Group heading="Challenges" className={groupClasses}>
                  {CHALLENGES.map((challenge) => (
                    <Item
                      key={challenge.id}
                      value={`challenge ${challenge.title}`}
                      keywords={[challenge.labId]}
                      onSelect={() => go(`/challenges#${challenge.id}`)}
                      icon={<Target className="size-4" />}
                      hint={`${challenge.points} pts`}
                    >
                      {challenge.title}
                    </Item>
                  ))}
                </Command.Group>
              )}

              {GLOSSARY.length > 0 && (
                <Command.Group heading="Glossary" className={groupClasses}>
                  {GLOSSARY.map((term) => (
                    <Item
                      key={term.id}
                      value={`term ${term.term}`}
                      keywords={[...term.aliases, term.short]}
                      onSelect={() => go(`/glossary/${term.id}`)}
                      icon={<BookMarked className="size-4" />}
                    >
                      {term.term}
                    </Item>
                  ))}
                </Command.Group>
              )}

              {LIBRARY.length > 0 && (
                <Command.Group heading="Library" className={groupClasses}>
                  {LIBRARY.map((source) => (
                    <Item
                      key={source.id}
                      value={`book ${source.title}`}
                      keywords={[...(source.authors ?? []), source.publisher]}
                      onSelect={() => go(`/library#${source.id}`)}
                      icon={<Library className="size-4" />}
                      hint={source.year ? String(source.year) : undefined}
                    >
                      {source.title}
                    </Item>
                  ))}
                </Command.Group>
              )}

              <Command.Group heading="Actions" className={groupClasses}>
                <Item
                  value="action presenter mode"
                  onSelect={() => {
                    updateSettings({ presenter: !settings.presenter });
                    onOpenChange(false);
                  }}
                  icon={<Presentation className="size-4" />}
                >
                  {settings.presenter ? 'Exit presenter mode' : 'Enter presenter mode'}
                </Item>
                <Item
                  value="action dark theme"
                  onSelect={() => updateSettings({ theme: 'dark' })}
                  icon={<Moon className="size-4" />}
                >
                  Use dark theme
                </Item>
                <Item
                  value="action light theme"
                  onSelect={() => updateSettings({ theme: 'light' })}
                  icon={<Sun className="size-4" />}
                >
                  Use light theme
                </Item>
                <Item
                  value="action system theme"
                  onSelect={() => updateSettings({ theme: 'system' })}
                  icon={<Monitor className="size-4" />}
                >
                  Match system theme
                </Item>
              </Command.Group>
            </Command.List>
            <div className="border-line text-fg-subtle flex items-center gap-4 border-t px-4 py-2 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> to move
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeft className="size-3" />
                </Kbd>
                to open
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
