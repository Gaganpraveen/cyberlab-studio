// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  SCRIPT_FLAG,
  SHADOW_FLAG,
  exploitRootScript,
  octalMode,
  parseOctal,
  readShadow,
  symbolicMode,
} from './engine';

describe('mode rendering', () => {
  it('renders symbolic modes including special bits', () => {
    expect(symbolicMode(0o777)).toBe('-rwxrwxrwx');
    expect(symbolicMode(0o644)).toBe('-rw-r--r--');
    expect(symbolicMode(0o4755)).toBe('-rwsr-xr-x'); // setuid
    expect(symbolicMode(0o640)).toBe('-rw-r-----');
  });

  it('renders and parses octal', () => {
    expect(octalMode(0o777)).toBe('777');
    expect(octalMode(0o4755)).toBe('4755');
    expect(parseOctal('640')).toBe(0o640);
    expect(parseOctal('4755')).toBe(0o4755);
    expect(parseOctal('nope')).toBeNull();
    expect(parseOctal('8')).toBeNull();
  });
});

describe('world-writable root script', () => {
  it('escalates to root while world-writable', () => {
    const r = exploitRootScript(0o777);
    expect(r.success).toBe(true);
    expect(r.flag).toBe(SCRIPT_FLAG);
  });

  it('is closed once world-write is removed', () => {
    expect(exploitRootScript(0o755).success).toBe(false);
    expect(exploitRootScript(0o744).success).toBe(false);
  });
});

describe('world-readable shadow', () => {
  it('reads hashes while world-readable', () => {
    const r = readShadow(0o644);
    expect(r.success).toBe(true);
    expect(r.flag).toBe(SHADOW_FLAG);
  });

  it('is closed once other-read is removed', () => {
    expect(readShadow(0o640).success).toBe(false);
    expect(readShadow(0o600).success).toBe(false);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('os-permissions');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('perm-octal', '7')).toBe(true);
    expect(accepts('perm-escalate', SCRIPT_FLAG)).toBe(true);
    expect(accepts('perm-shadow', SHADOW_FLAG)).toBe(true);
    expect(accepts('perm-suid', 'setuid')).toBe(true);
  });
});
