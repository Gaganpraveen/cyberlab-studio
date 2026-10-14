import { Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/primitives';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/cn';
import {
  DEFAULT_SETTINGS,
  FONT_SCALES,
  type MotionPreference,
  type ThemePreference,
  updateSettings,
  useSettings,
} from '@/lib/settings';

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="border-line flex flex-col gap-4 border-b py-6 last:border-b-0 md:flex-row md:items-center md:justify-between">
      <div className="max-w-md">
        <h2 className="text-fg text-base font-semibold">{title}</h2>
        <p className="text-fg-muted mt-1 text-sm leading-relaxed">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="border-line bg-surface inline-flex rounded-lg border p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors',
              selected
                ? 'bg-surface-3 text-fg font-medium shadow-sm'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors',
        checked ? 'bg-accent border-accent' : 'bg-surface-3 border-line-strong',
      )}
    >
      <span
        className={cn(
          'bg-fg inline-block size-4 rounded-full shadow transition-transform',
          checked ? 'bg-on-accent translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const settings = useSettings();

  return (
    <PageContainer width="narrow">
      <PageHeader
        eyebrow="Settings"
        title="Make it comfortable"
        description="These settings are saved in this browser only."
      />

      <div className="mt-6">
        <Row
          title="Theme"
          description="Dark is easiest on the eyes for long sessions. System follows your device."
        >
          <Segmented<ThemePreference>
            label="Theme"
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: 'dark', label: 'Dark', icon: <Moon className="size-4" aria-hidden /> },
              { value: 'light', label: 'Light', icon: <Sun className="size-4" aria-hidden /> },
              {
                value: 'system',
                label: 'System',
                icon: <Monitor className="size-4" aria-hidden />,
              },
            ]}
          />
        </Row>

        <Row
          title="Text size"
          description="Scales all text and controls. Presenter mode makes them larger still."
        >
          <Segmented<number>
            label="Text size"
            value={settings.fontScale}
            onChange={(fontScale) => updateSettings({ fontScale })}
            options={FONT_SCALES.map((scale) => ({
              value: scale,
              label: `${Math.round(scale * 100)}%`,
            }))}
          />
        </Row>

        <Row
          title="Motion"
          description="Animations explain steps in diagrams and labs. Reduce turns them into instant changes."
        >
          <Segmented<MotionPreference>
            label="Motion"
            value={settings.motion}
            onChange={(motion) => updateSettings({ motion })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'full', label: 'Full' },
              { value: 'reduce', label: 'Reduce' },
            ]}
          />
        </Row>

        <Row
          title="Serif for lessons"
          description="Set long-form lesson text in a serif face, like a printed textbook."
        >
          <Switch
            label="Serif for lessons"
            checked={settings.serifLessons}
            onChange={(serifLessons) => updateSettings({ serifLessons })}
          />
        </Row>

        <Row
          title="Presenter mode"
          description="Larger type and controls for projectors and screen sharing in class."
        >
          <Switch
            label="Presenter mode"
            checked={settings.presenter}
            onChange={(presenter) => updateSettings({ presenter })}
          />
        </Row>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-fg-subtle text-sm">
          Looking for your saved progress? It lives on the{' '}
          <Link to="/progress" className="text-accent-text hover:underline">
            Progress page
          </Link>
          , with export and import.
        </p>
        <Button
          variant="ghost"
          icon={<RotateCcw className="size-4" aria-hidden />}
          onClick={() => updateSettings(DEFAULT_SETTINGS)}
        >
          Restore defaults
        </Button>
      </div>
    </PageContainer>
  );
}
