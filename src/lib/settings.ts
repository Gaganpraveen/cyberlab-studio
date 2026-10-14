import { createPersistentStore, useStore } from './persistentStore';

export type ThemePreference = 'system' | 'dark' | 'light';
export type MotionPreference = 'system' | 'reduce' | 'full';

export interface Settings {
  theme: ThemePreference;
  motion: MotionPreference;
  /** Multiplier for the root font size: 1, 1.125, 1.25 or 1.5. */
  fontScale: number;
  /** Presenter mode: larger type and controls for projectors. */
  presenter: boolean;
  /** Prefer the serif face for long-form lesson text. */
  serifLessons: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  motion: 'system',
  fontScale: 1,
  presenter: false,
  serifLessons: false,
};

export const FONT_SCALES = [1, 1.125, 1.25, 1.5] as const;

function normalize(raw: unknown): Settings {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>;
  return {
    theme: ['system', 'dark', 'light'].includes(value.theme as string)
      ? (value.theme as ThemePreference)
      : DEFAULT_SETTINGS.theme,
    motion: ['system', 'reduce', 'full'].includes(value.motion as string)
      ? (value.motion as MotionPreference)
      : DEFAULT_SETTINGS.motion,
    fontScale: FONT_SCALES.includes(value.fontScale as (typeof FONT_SCALES)[number])
      ? (value.fontScale as number)
      : DEFAULT_SETTINGS.fontScale,
    presenter: typeof value.presenter === 'boolean' ? value.presenter : DEFAULT_SETTINGS.presenter,
    serifLessons:
      typeof value.serifLessons === 'boolean' ? value.serifLessons : DEFAULT_SETTINGS.serifLessons,
  };
}

export const settingsStore = createPersistentStore<Settings>(
  'settings:v1',
  DEFAULT_SETTINGS,
  normalize,
);

export function useSettings(): Settings {
  return useStore(settingsStore);
}

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((prev) => ({ ...prev, ...patch }));
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export function resolveTheme(theme: ThemePreference): 'dark' | 'light' {
  if (theme === 'system') return prefersDark() ? 'dark' : 'light';
  return theme;
}

export function resolveReducedMotion(motion: MotionPreference): boolean {
  if (motion === 'system') return prefersReducedMotion();
  return motion === 'reduce';
}

/** Mirror settings onto <html> so CSS can react before React renders. */
export function applySettingsToDocument(settings: Settings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const theme = resolveTheme(settings.theme);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.dataset.motion = resolveReducedMotion(settings.motion) ? 'reduce' : 'full';
  root.dataset.presenter = settings.presenter ? 'on' : 'off';
  root.dataset.serif = settings.serifLessons ? 'on' : 'off';
  const scale = settings.presenter ? Math.max(settings.fontScale, 1.25) : settings.fontScale;
  root.style.setProperty('--font-scale', String(scale));
}

let initialized = false;

/** Apply stored settings once at startup and keep <html> in sync afterwards. */
export function initSettings(): void {
  if (initialized) return;
  initialized = true;
  applySettingsToDocument(settingsStore.get());
  settingsStore.subscribe(() => applySettingsToDocument(settingsStore.get()));
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const rerun = () => applySettingsToDocument(settingsStore.get());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerun);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', rerun);
  }
}

/** For components: true when animations should be minimized. */
export function useReducedMotion(): boolean {
  const settings = useSettings();
  return resolveReducedMotion(settings.motion);
}
