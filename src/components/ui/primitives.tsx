import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Info,
  type LucideIcon,
  OctagonAlert,
  Sparkles,
} from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const badgeTones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-muted border-line',
  accent: 'bg-accent-soft text-accent-text border-accent/25',
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  info: 'bg-info-soft text-info border-info/25',
};

export function Badge({
  tone = 'neutral',
  icon,
  className,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Card({
  className,
  interactive = false,
  children,
  ...props
}: ComponentPropsWithoutRef<'div'> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'bg-surface border-line rounded-2xl border',
        interactive &&
          'hover:border-line-strong hover:bg-surface-2/60 transition-colors duration-150',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'border-line-strong bg-surface-2 text-fg-muted inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[0.6875rem] leading-none',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

const calloutIcons: Record<Tone, LucideIcon> = {
  neutral: Info,
  accent: Sparkles,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: OctagonAlert,
  info: Info,
};

const calloutTones: Record<Tone, string> = {
  neutral: 'bg-surface-2 border-line',
  accent: 'bg-accent-soft border-accent/30',
  success: 'bg-success-soft border-success/30',
  warning: 'bg-warning-soft border-warning/30',
  danger: 'bg-danger-soft border-danger/30',
  info: 'bg-info-soft border-info/30',
};

const calloutIconTones: Record<Tone, string> = {
  neutral: 'text-fg-muted',
  accent: 'text-accent-text',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

export function Callout({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = calloutIcons[tone];
  return (
    <div
      className={cn('flex gap-3 rounded-xl border px-4 py-3', calloutTones[tone], className)}
      role="note"
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', calloutIconTones[tone])} aria-hidden />
      <div className="min-w-0 space-y-1 text-[0.9375rem] leading-relaxed">
        {title && <div className="text-fg font-semibold">{title}</div>}
        {children && <div className="text-fg-muted [&_p+p]:mt-2">{children}</div>}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow && (
          <div className="text-fg-subtle text-xs font-semibold tracking-[0.12em] uppercase">
            {eyebrow}
          </div>
        )}
        <h1 className="text-fg text-[1.875rem] leading-tight font-semibold tracking-tight text-balance md:text-[2.25rem]">
          {title}
        </h1>
        {description && (
          <p className="text-fg-muted max-w-[68ch] text-base leading-relaxed text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
  tone = 'accent',
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
  tone?: 'accent' | 'success';
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={cn('bg-surface-3 h-1.5 w-full overflow-hidden rounded-full', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          tone === 'success' ? 'bg-success' : 'bg-accent',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon: Icon = FlaskConical,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border-line flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
      <Icon className="text-fg-subtle size-8" aria-hidden />
      <div className="text-fg text-lg font-semibold">{title}</div>
      {children && <div className="text-fg-muted max-w-md text-sm leading-relaxed">{children}</div>}
      {action}
    </div>
  );
}

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2', className)}>
      <span className="border-line-strong border-t-accent size-4 animate-spin rounded-full border-2" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function SectionTitle({
  children,
  action,
  id,
}: {
  children: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 id={id} className="text-fg text-lg font-semibold tracking-tight">
        {children}
      </h2>
      {action}
    </div>
  );
}

export const inputClasses =
  'w-full rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm text-fg ' +
  'placeholder:text-fg-subtle transition-colors focus:border-accent focus:outline-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ' +
  'disabled:opacity-60';
