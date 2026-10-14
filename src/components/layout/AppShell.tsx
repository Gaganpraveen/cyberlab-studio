import { Dialog as DialogPrimitive } from 'radix-ui';
import { Menu, Monitor, Moon, Presentation, Search, Sun, X } from 'lucide-react';
import { lazy, type ReactNode, Suspense, useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';

import { Kbd } from '@/components/ui/primitives';
import { Tooltip } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { updateSettings, useSettings } from '@/lib/settings';

import { Logo } from './Logo';
import { type NavItem, PRIMARY_NAV, SECONDARY_NAV } from './navigation';
import { loadCommandPalette, useCommandPaletteShortcut } from './paletteShortcut';

const CommandPalette = lazy(loadCommandPalette);

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                isActive
                  ? 'bg-surface-3 text-fg font-medium'
                  : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'size-4 shrink-0 transition-colors',
                    isActive ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted',
                  )}
                  aria-hidden
                />
                {item.label}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center px-4">
        <NavLink to="/" onClick={onNavigate} aria-label="CyberLab Studio home">
          <Logo />
        </NavLink>
      </div>
      <nav
        aria-label="Main"
        className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto px-3 pb-4"
      >
        <NavList items={PRIMARY_NAV} onNavigate={onNavigate} />
        <div className="space-y-4 pt-6">
          <NavList items={SECONDARY_NAV} onNavigate={onNavigate} />
          <p className="text-fg-subtle px-3 text-xs leading-relaxed">
            Labs run only inside your browser. Never use these techniques on systems you do not own
            or have written permission to test.
          </p>
        </div>
      </nav>
    </div>
  );
}

const themeCycle = { dark: 'light', light: 'system', system: 'dark' } as const;
const themeIcon = { dark: Moon, light: Sun, system: Monitor } as const;
const themeLabel = { dark: 'Dark theme', light: 'Light theme', system: 'System theme' } as const;

function TopBar({
  onOpenPalette,
  onPrefetchPalette,
  onOpenMenu,
}: {
  onOpenPalette: () => void;
  onPrefetchPalette: () => void;
  onOpenMenu: () => void;
}) {
  const settings = useSettings();
  const ThemeIcon = themeIcon[settings.theme];
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="border-line bg-canvas/85 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-3 backdrop-blur-md md:px-5">
      <button
        type="button"
        onClick={onOpenMenu}
        className="text-fg-muted hover:text-fg hover:bg-surface-2 rounded-lg p-2 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>
      <div className="shrink-0 lg:hidden">
        <Logo />
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        onPointerEnter={onPrefetchPalette}
        onFocus={onPrefetchPalette}
        className="border-line bg-surface hover:border-line-strong text-fg-subtle ml-auto flex h-9 w-full max-w-md items-center gap-2 rounded-lg border px-3 text-sm transition-colors lg:mx-auto lg:ml-0"
        aria-label="Search lessons, labs, and terms"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="hidden truncate sm:inline">Search lessons, labs, terms…</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex">
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="flex items-center gap-1">
        <Tooltip
          content={
            settings.presenter
              ? 'Exit presenter mode'
              : 'Presenter mode (larger text for projectors)'
          }
        >
          <button
            type="button"
            onClick={() => updateSettings({ presenter: !settings.presenter })}
            aria-pressed={settings.presenter}
            aria-label="Presenter mode"
            className={cn(
              'rounded-lg p-2 transition-colors',
              settings.presenter
                ? 'bg-accent-soft text-accent-text'
                : 'text-fg-muted hover:text-fg hover:bg-surface-2',
            )}
          >
            <Presentation className="size-[1.125rem]" />
          </button>
        </Tooltip>
        <Tooltip content={`${themeLabel[settings.theme]} (click to switch)`}>
          <button
            type="button"
            onClick={() => updateSettings({ theme: themeCycle[settings.theme] })}
            aria-label={`${themeLabel[settings.theme]}. Switch theme`}
            className="text-fg-muted hover:text-fg hover:bg-surface-2 rounded-lg p-2 transition-colors"
          >
            <ThemeIcon className="size-[1.125rem]" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}

/** The application frame: sidebar, top bar, command palette, and the routed page. */
export function AppShell() {
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  // The palette mounts on first use so its search index stays out of the first load.
  const [paletteMounted, setPaletteMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openPalette = useCallback(() => {
    setPaletteMounted(true);
    setPaletteOpen(true);
  }, []);
  const prefetchPalette = useCallback(() => void loadCommandPalette(), []);
  useCommandPaletteShortcut(openPalette);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => void loadCommandPalette());
    return () => cancel(handle);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="bg-accent text-on-accent sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="border-line bg-surface/50 sticky top-0 hidden h-dvh w-60 shrink-0 border-r lg:block">
        <SidebarContent />
      </aside>

      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="animate-fade-in fixed inset-0 z-40 bg-black/50 lg:hidden" />
          <DialogPrimitive.Content className="bg-surface border-line animate-rise-in fixed inset-y-0 left-0 z-50 w-72 border-r lg:hidden">
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Main navigation links
            </DialogPrimitive.Description>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
            <DialogPrimitive.Close
              className="text-fg-subtle hover:text-fg absolute top-3.5 right-3 rounded-md p-1.5"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onOpenPalette={openPalette}
          onPrefetchPalette={prefetchPalette}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <div key={location.pathname} className="animate-rise-in">
            <Outlet />
          </div>
        </main>
      </div>

      {paletteMounted && (
        <Suspense fallback={null}>
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </Suspense>
      )}
      <ScrollRestoration />
    </div>
  );
}

/** Standard page width and padding for content pages (not used by full-bleed labs). */
export function PageContainer({
  children,
  className,
  width = 'default',
}: {
  children: ReactNode;
  className?: string;
  width?: 'default' | 'narrow' | 'wide';
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-8 md:px-8 md:py-10',
        width === 'narrow' && 'max-w-3xl',
        width === 'default' && 'max-w-6xl',
        width === 'wide' && 'max-w-7xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
