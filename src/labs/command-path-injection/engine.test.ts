// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  COMMAND_FLAG,
  CMD_NONE,
  PATH_FLAG,
  PATH_NONE,
  normalizePath,
  readFile,
  runPing,
} from './engine';

describe('command injection', () => {
  it('runs a legitimate ping with no injection', () => {
    const r = runPing('localhost', CMD_NONE);
    expect(r.injected).toBe(false);
    expect(r.outputs[0]).toContain('PING localhost');
  });

  it('runs an injected command through the shell when undefended', () => {
    const r = runPing('localhost; cat /flag', CMD_NONE);
    expect(r.injected).toBe(true);
    expect(r.flag).toBe(COMMAND_FLAG);
  });

  it('argument-array execution treats metacharacters as a literal host', () => {
    const r = runPing('localhost; cat /flag', { argArray: true, allowlist: false });
    expect(r.injected).toBe(false);
    expect(r.flag).toBeUndefined();
    expect(r.executed).toContain('execFile');
  });

  it('an input allowlist rejects anything that is not a hostname', () => {
    const r = runPing('localhost; cat /flag', { argArray: false, allowlist: true });
    expect(r.blocked).toBe(true);
    expect(r.outputs).toHaveLength(0);
  });

  it('runs a command through $(...) substitution when undefended', () => {
    const r = runPing('$(cat /flag)', CMD_NONE);
    expect(r.injected).toBe(true);
    expect(r.flag).toBe(COMMAND_FLAG);
  });

  it('runs a command through backtick substitution when undefended', () => {
    const r = runPing('`cat /flag`', CMD_NONE);
    expect(r.injected).toBe(true);
    expect(r.flag).toBe(COMMAND_FLAG);
  });

  it('argument arrays neutralize command substitution too', () => {
    const r = runPing('$(cat /flag)', { argArray: true, allowlist: false });
    expect(r.injected).toBe(false);
    expect(r.flag).toBeUndefined();
  });

  it('an allowlist rejects a substitution payload', () => {
    const r = runPing('$(cat /flag)', { argArray: false, allowlist: true });
    expect(r.blocked).toBe(true);
  });

  it('rejects a leading hyphen so option injection fails even with an arg array', () => {
    // `--` before the host means `-v` is read as a (bogus) hostname, not an option.
    const r = runPing('-v', { argArray: true, allowlist: false });
    expect(r.outputs[0]).toContain('Name or service not known');
  });
});

describe('path traversal', () => {
  it('normalizes . and .. segments', () => {
    expect(normalizePath('/var/www/files/../../../etc/app/secret.txt')).toBe('/etc/app/secret.txt');
    expect(normalizePath('/var/www/files/./report.txt')).toBe('/var/www/files/report.txt');
  });

  it('reads a legitimate file inside the base directory', () => {
    const r = readFile('welcome.txt', PATH_NONE);
    expect(r.escaped).toBe(false);
    expect(r.content).toContain('documents service');
  });

  it('escapes the base directory with ../ when undefended', () => {
    const r = readFile('../../../etc/app/secret.txt', PATH_NONE);
    expect(r.escaped).toBe(true);
    expect(r.flag).toBe(PATH_FLAG);
  });

  it('is blocked when the path is confined to the base directory', () => {
    const r = readFile('../../../etc/app/secret.txt', { confine: true });
    expect(r.blocked).toBe(true);
    expect(r.content).toBeNull();
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('command-path-injection');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('cmd-inject', COMMAND_FLAG)).toBe(true);
    expect(accepts('cmd-term', 'command injection')).toBe(true);
    expect(accepts('path-traversal', PATH_FLAG)).toBe(true);
    expect(accepts('path-term', 'path traversal')).toBe(true);
  });
});
