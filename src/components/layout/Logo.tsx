import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-7', className)} aria-hidden focusable="false">
      <rect width="64" height="64" rx="14" className="fill-surface-3" />
      <path
        d="M32 10 50 17v13c0 11.5-7.6 20.6-18 24-10.4-3.4-18-12.5-18-24V17l18-7Z"
        fill="none"
        className="stroke-accent-text"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M24 33.5 29.5 39 41 26"
        fill="none"
        className="stroke-fg"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-fg text-[0.9375rem] font-semibold tracking-tight whitespace-nowrap">
        CyberLab <span className="text-fg-muted font-normal">Studio</span>
      </span>
    </span>
  );
}
