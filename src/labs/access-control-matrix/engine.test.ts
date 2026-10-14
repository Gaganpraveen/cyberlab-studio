// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  IDOR_FLAG,
  INSECURE_POLICY,
  PRIV_ESC_FLAG,
  type Policy,
  authorize,
  isAccessControlEnforced,
  resourceById,
  userById,
} from './engine';

const mallory = userById('mallory')!;
const alice = userById('alice')!;
const root = userById('root')!;
const docAlice = resourceById('doc-alice')!;
const adminUsers = resourceById('admin-users')!;

const SECURE: Policy = { ownershipCheck: true, roleCheck: true };

describe('insecure default (authenticated-only)', () => {
  it('lets the attacker read another user document — IDOR', () => {
    const d = authorize(mallory, docAlice, 'read', INSECURE_POLICY);
    expect(d.allowed).toBe(true);
    expect(docAlice.secret).toContain(IDOR_FLAG);
  });

  it('lets a normal user reach the admin endpoint — privilege escalation', () => {
    const d = authorize(mallory, adminUsers, 'read', INSECURE_POLICY);
    expect(d.allowed).toBe(true);
    expect(adminUsers.secret).toContain(PRIV_ESC_FLAG);
  });
});

describe('ownership check', () => {
  it('blocks cross-user access but keeps the owner and admin in', () => {
    const policy: Policy = { ownershipCheck: true, roleCheck: false };
    expect(authorize(mallory, docAlice, 'read', policy).allowed).toBe(false);
    expect(authorize(alice, docAlice, 'read', policy).allowed).toBe(true);
    expect(authorize(root, docAlice, 'read', policy).allowed).toBe(true); // admin override
  });
});

describe('role check', () => {
  it('blocks non-admins from admin-only resources', () => {
    const policy: Policy = { ownershipCheck: false, roleCheck: true };
    expect(authorize(mallory, adminUsers, 'read', policy).allowed).toBe(false);
    expect(authorize(root, adminUsers, 'read', policy).allowed).toBe(true);
  });
});

describe('access control enforcement', () => {
  it('is reached only when both checks are on', () => {
    expect(isAccessControlEnforced(INSECURE_POLICY)).toBe(false);
    expect(isAccessControlEnforced(SECURE)).toBe(true);
    expect(authorize(mallory, docAlice, 'read', SECURE).allowed).toBe(false);
    expect(authorize(mallory, adminUsers, 'read', SECURE).allowed).toBe(false);
  });

  it('still lets the admin override read every object (so it is not full least privilege)', () => {
    expect(authorize(root, docAlice, 'read', SECURE).allowed).toBe(true);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('access-control-matrix');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('acl-idor', IDOR_FLAG)).toBe(true);
    expect(accepts('acl-priv-esc', PRIV_ESC_FLAG)).toBe(true);
    expect(accepts('acl-term', 'idor')).toBe(true);
    expect(accepts('acl-principle', 'least privilege')).toBe(true);
  });
});
