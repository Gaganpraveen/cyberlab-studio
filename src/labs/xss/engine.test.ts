// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  PAYLOADS,
  XSS_MARKER,
  buildSandboxDocument,
  containsLiveMarkup,
  escapeHtml,
  gradeMode,
  looksExecutable,
  renderCommentBody,
} from './engine';

describe('escapeHtml', () => {
  it('neutralizes the five HTML-significant characters', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml(`"'`)).toBe('&quot;&#39;');
  });

  it('escapes the ampersand first so entities are not double-formed', () => {
    // If & were escaped last, "<" -> "&lt;" would become "&amp;lt;".
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
  });
});

describe('renderCommentBody', () => {
  it('passes raw input through in vulnerable mode', () => {
    const payload = '<img src=x onerror=alert(1)>';
    expect(renderCommentBody('vulnerable', payload)).toBe(payload);
    expect(containsLiveMarkup(renderCommentBody('vulnerable', payload))).toBe(true);
  });

  it('escapes input in safe mode so no live markup survives', () => {
    for (const p of PAYLOADS) {
      const rendered = renderCommentBody('safe', p.value);
      expect(containsLiveMarkup(rendered)).toBe(false);
      expect(rendered).not.toContain('<');
    }
  });
});

describe('gradeMode', () => {
  it('reports vulnerable rendering as insecure (payloads stay live)', () => {
    const report = gradeMode('vulnerable');
    expect(report.secure).toBe(false);
    expect(report.rows.every((r) => r.inert)).toBe(false);
  });

  it('reports safe rendering as secure (every payload inert)', () => {
    const report = gradeMode('safe');
    expect(report.secure).toBe(true);
    expect(report.rows).toHaveLength(PAYLOADS.length);
    expect(report.rows.every((r) => r.inert)).toBe(true);
  });
});

describe('looksExecutable', () => {
  it('flags classic injection vectors', () => {
    expect(looksExecutable('<script>x</script>')).toBe(true);
    expect(looksExecutable('<img src=x onerror=y>')).toBe(true);
    expect(looksExecutable('<svg onload=y>')).toBe(true);
    expect(looksExecutable('<a href="javascript:x">')).toBe(true);
  });

  it('does not flag ordinary text', () => {
    expect(looksExecutable('I really liked this article, thanks!')).toBe(false);
  });
});

describe('buildSandboxDocument', () => {
  it('always carries a restrictive Content-Security-Policy', () => {
    for (const mode of ['vulnerable', 'safe'] as const) {
      const doc = buildSandboxDocument(mode, '<b>hi</b>');
      expect(doc).toContain('Content-Security-Policy');
      expect(doc).toContain("default-src 'none'");
    }
  });

  it('embeds the raw payload in vulnerable mode and the escaped payload in safe mode', () => {
    const payload = PAYLOADS[0]?.value ?? '';
    expect(buildSandboxDocument('vulnerable', payload)).toContain(payload);
    const safeDoc = buildSandboxDocument('safe', payload);
    expect(safeDoc).not.toContain(payload);
    expect(safeDoc).toContain(escapeHtml(payload));
  });

  it('only ever carries the harmless marker, never a real exfiltration call', () => {
    for (const p of PAYLOADS) {
      expect(p.value).toContain(XSS_MARKER);
      expect(p.value.toLowerCase()).not.toContain('document.cookie');
      expect(p.value.toLowerCase()).not.toContain('fetch(');
    }
  });
});

describe('challenges', () => {
  it('are well-formed and unique', () => {
    expect(challenges.length).toBeGreaterThan(0);
    const ids = challenges.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of challenges) {
      expect(c.labId).toBe('xss');
      expect(c.prompt.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(0);
      if (c.kind === 'answer') {
        expect(c.acceptedHashes && c.acceptedHashes.length).toBeTruthy();
      }
    }
  });

  it('accepts the canonical answers for answer challenges', () => {
    const find = (id: string) => challenges.find((c) => c.id === id)!;
    expect(find('xss-escape').acceptedHashes).toContain(hashAnswer('&lt;'));
    expect(find('xss-defense').acceptedHashes).toContain(hashAnswer('output encoding'));
    expect(find('xss-csp').acceptedHashes).toContain(hashAnswer('content-security-policy'));
  });
});
