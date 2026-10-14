/**
 * The logic behind the XSS lab. The actual "attack" runs inside a sandboxed
 * iframe that has no access to this app, no same-origin, and no network — the
 * only thing a payload can do is post a harmless marker back to the lab so it
 * can tell whether the comment executed. These pure functions decide how a
 * comment is rendered (vulnerable vs. safe) and whether the output is inert.
 */

/** The harmless signal a demo payload sends so the lab can detect execution. */
export const XSS_MARKER = 'cyberlab:xss-executed';

/** Turn text into HTML-safe text — the core output-encoding defense. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type RenderMode = 'vulnerable' | 'safe';

/**
 * Produce the comment body that will be placed in the page.
 * - vulnerable: the raw input is used as HTML (the bug).
 * - safe: the input is escaped, so it can only ever be shown as text.
 */
export function renderCommentBody(mode: RenderMode, input: string): string {
  return mode === 'safe' ? escapeHtml(input) : input;
}

/** Does this string contain live markup (a real tag), rather than plain text? */
export function containsLiveMarkup(html: string): boolean {
  return /<[a-z!/]/i.test(html);
}

/** A heuristic that flags inputs carrying a classic execution vector. */
export function looksExecutable(input: string): boolean {
  return /<script|<\s*img|<\s*svg|<\s*iframe|on\w+\s*=|javascript:/i.test(input);
}

/** Canonical teaching payloads whose action is only to post the marker. */
export interface Payload {
  label: string;
  value: string;
  note: string;
}

export const PAYLOADS: Payload[] = [
  {
    label: 'Script tag',
    value: `<script>parent.postMessage('${XSS_MARKER}','*')</script>`,
    note: 'A script element that runs when the page is parsed.',
  },
  {
    label: 'Image onerror',
    value: `<img src=x onerror="parent.postMessage('${XSS_MARKER}','*')">`,
    note: 'A broken image whose error handler runs the script.',
  },
  {
    label: 'SVG onload',
    value: `<svg onload="parent.postMessage('${XSS_MARKER}','*')"></svg>`,
    note: 'An SVG element that runs script as soon as it loads.',
  },
];

export interface GradeRow {
  payload: string;
  inert: boolean;
}

export interface GradeReport {
  mode: RenderMode;
  rows: GradeRow[];
  secure: boolean;
}

/** Check every demo payload against a render mode: are they all inert? */
export function gradeMode(mode: RenderMode): GradeReport {
  const rows = PAYLOADS.map((p) => ({
    payload: p.value,
    inert: !containsLiveMarkup(renderCommentBody(mode, p.value)),
  }));
  return { mode, rows, secure: rows.every((r) => r.inert) };
}

/**
 * Build the full HTML document for the sandboxed iframe. It carries a strict
 * Content-Security-Policy and defines nothing the payload needs; the iframe is
 * loaded with `sandbox="allow-scripts"` (no allow-same-origin) by the lab, so
 * this document runs in an opaque origin with no access to the app.
 */
export function buildSandboxDocument(mode: RenderMode, input: string): string {
  const body = renderCommentBody(mode, input);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'" />
    <style>
      body { font: 14px/1.5 system-ui, sans-serif; color: #e8e4da; background: #1b1a18; margin: 0; padding: 12px; }
      .card { border: 1px solid #333028; border-radius: 10px; padding: 10px 12px; background: #222019; }
      .who { color: #e39573; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="card"><span class="who">Guest</span>: ${body}</div>
  </body>
</html>`;
}
