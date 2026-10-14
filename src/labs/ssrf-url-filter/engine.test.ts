// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  ADMIN_FLAG,
  FETCH_NONE,
  METADATA_FLAG,
  fetchUrl,
  isInternalIp,
  resolveHost,
} from './engine';

describe('internal IP detection', () => {
  it('flags loopback, link-local, and private ranges', () => {
    expect(isInternalIp('127.0.0.1')).toBe(true);
    expect(isInternalIp('169.254.169.254')).toBe(true);
    expect(isInternalIp('10.0.0.5')).toBe(true);
    expect(isInternalIp('192.168.1.1')).toBe(true);
    expect(isInternalIp('172.16.0.1')).toBe(true);
    expect(isInternalIp('93.184.216.34')).toBe(false);
  });
});

describe('SSRF with no defenses', () => {
  it('reaches the cloud metadata endpoint and steals credentials', () => {
    const r = fetchUrl('http://169.254.169.254/latest/meta-data/iam/', FETCH_NONE);
    expect(r.internal).toBe(true);
    expect(r.flag).toBe(METADATA_FLAG);
  });

  it('reaches the loopback admin panel', () => {
    const r = fetchUrl('http://localhost:8080/admin', FETCH_NONE);
    expect(r.resolvedIp).toBe('127.0.0.1');
    expect(r.flag).toBe(ADMIN_FLAG);
  });

  it('is reached through a benign-looking hostname that resolves internal', () => {
    expect(resolveHost('metadata.evil.example')).toBe('169.254.169.254');
    const r = fetchUrl('http://metadata.evil.example/', FETCH_NONE);
    expect(r.internal).toBe(true);
    expect(r.flag).toBe(METADATA_FLAG);
  });
});

describe('defenses', () => {
  it('blocking internal IPs refuses the metadata fetch (after resolving the host)', () => {
    expect(
      fetchUrl('http://169.254.169.254/', { allowlist: false, blockInternal: true }).blocked,
    ).toBe(true);
    expect(
      fetchUrl('http://metadata.evil.example/', { allowlist: false, blockInternal: true }).blocked,
    ).toBe(true);
  });

  it('a destination allowlist refuses anything not on it', () => {
    expect(
      fetchUrl('http://169.254.169.254/', { allowlist: true, blockInternal: false }).blocked,
    ).toBe(true);
    const ok = fetchUrl('http://example.com/logo.png', { allowlist: true, blockInternal: true });
    expect(ok.blocked).toBe(false);
    expect(ok.status).toBe(200);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('ssrf-url-filter');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('ssrf-metadata', METADATA_FLAG)).toBe(true);
    expect(accepts('ssrf-term', 'server-side request forgery')).toBe(true);
    expect(accepts('ssrf-localhost', ADMIN_FLAG)).toBe(true);
    expect(accepts('ssrf-resolve', 'the resolved ip address')).toBe(true);
  });
});
