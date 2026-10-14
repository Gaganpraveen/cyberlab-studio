/** True inside the desktop app: Tauri adds this global to its window. */
export const isDesktopApp = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * In the desktop app, a link that would open a new tab (a reading, a
 * standard, GitHub) navigates the window instead. The app catches that
 * navigation and hands the address to the system browser, so the window
 * always stays on CyberLab Studio. Does nothing on the website.
 */
export function routeExternalLinksToBrowser(): void {
  if (!isDesktopApp) return;
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(link instanceof HTMLAnchorElement)) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin === window.location.origin) return;
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return;
    event.preventDefault();
    window.location.assign(url.href);
  });
}
