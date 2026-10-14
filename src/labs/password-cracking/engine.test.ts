// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  LEAKED_SALTED,
  LEAKED_UNSALTED,
  WORDLIST,
  crackSalted,
  crackUnsalted,
  fastHash,
  pbkdf2Hex,
  reusedPasswordUsers,
  saltFor,
} from './engine';

const byUser = (rows: { user: string; password: string | null }[]) =>
  Object.fromEntries(rows.map((r) => [r.user, r.password]));

describe('unsalted fast hashes', () => {
  it('crack every weak password and leave the strong one', () => {
    const report = crackUnsalted(LEAKED_UNSALTED, WORDLIST);
    const found = byUser(report.rows);
    expect(found['admin']).toBe('password123');
    expect(found['j.rivera']).toBe('letmein');
    expect(found['t.walsh']).toBe('qwerty');
    expect(found['s.patel']).toBeNull(); // not in the wordlist
    expect(report.cracked).toBe(5);
  });

  it('cost only one pass over the wordlist, shared across all accounts', () => {
    const report = crackUnsalted(LEAKED_UNSALTED, WORDLIST);
    expect(report.work).toBe(WORDLIST.length);
  });

  it('expose password reuse as identical hashes', () => {
    const groups = reusedPasswordUsers(LEAKED_UNSALTED);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.sort()).toEqual(['admin', 'm.okoro']);
  });
});

describe('salting', () => {
  it('gives reused passwords different hashes', () => {
    const admin = LEAKED_SALTED.find((l) => l.user === 'admin')!;
    const okoro = LEAKED_SALTED.find((l) => l.user === 'm.okoro')!;
    expect(admin.hash).not.toBe(okoro.hash);
    expect(reusedPasswordUsers(LEAKED_SALTED)).toHaveLength(0);
  });

  it('forces the attacker to redo the wordlist per account', () => {
    const report = crackSalted(LEAKED_SALTED, WORDLIST);
    expect(byUser(report.rows)['admin']).toBe('password123');
    // Far more work than the unsalted case: up to wordlist x accounts.
    expect(report.work).toBeGreaterThan(WORDLIST.length);
    expect(report.work).toBeLessThanOrEqual(WORDLIST.length * LEAKED_SALTED.length);
  });
});

describe('slow hashing (PBKDF2)', () => {
  it('is deterministic and differs from the fast hash', async () => {
    const a = await pbkdf2Hex('password123', saltFor('admin'), 10000);
    const b = await pbkdf2Hex('password123', saltFor('admin'), 10000);
    expect(a).toBe(b);
    expect(a).not.toBe(fastHash('password123'));
  });

  it('changes with the salt and the iteration count', async () => {
    const base = await pbkdf2Hex('password123', saltFor('admin'), 10000);
    expect(await pbkdf2Hex('password123', saltFor('m.okoro'), 10000)).not.toBe(base);
    expect(await pbkdf2Hex('password123', saltFor('admin'), 20000)).not.toBe(base);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('password-cracking');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('pw-crack-admin', 'password123')).toBe(true);
    expect(accepts('pw-reuse', 'm.okoro')).toBe(true);
    expect(accepts('pw-uncracked', 's.patel')).toBe(true);
    expect(accepts('pw-kdf', 'pbkdf2')).toBe(true);
    expect(accepts('pw-kdf', 'bcrypt')).toBe(true);
  });
});
