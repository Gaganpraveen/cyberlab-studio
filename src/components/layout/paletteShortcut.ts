import { useEffect } from 'react';

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
      } else if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}

/** The palette and the search index it carries load on demand, after the page is idle. */
export const loadCommandPalette = () => import('./CommandPalette');
