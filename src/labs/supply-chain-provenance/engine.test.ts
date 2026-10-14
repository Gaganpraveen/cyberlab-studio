// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  DEFAULT_DEP_DEFENSES,
  DEPENDENCIES,
  RELEASES,
  runInstall,
  verifyProvenance,
} from './engine';

describe('dependency integrity', () => {
  it('both malicious packages install when nothing is verified', () => {
    const r = runInstall(DEFAULT_DEP_DEFENSES);
    expect(r.maliciousTotal).toBe(2);
    expect(r.maliciousInstalled).toBe(2);
    expect(r.clean).toBe(false);
    expect(r.flag).toBeUndefined();
  });

  it('hash pinning catches the tampered tarball but not confusion', () => {
    const r = runInstall({ verifyHashes: true, scopeInternalRegistry: false });
    expect(r.maliciousBlocked).toBe(1);
    expect(r.maliciousInstalled).toBe(1);
  });

  it('registry scoping catches confusion but not the tampered tarball', () => {
    const r = runInstall({ verifyHashes: false, scopeInternalRegistry: true });
    expect(r.maliciousBlocked).toBe(1);
    expect(r.maliciousInstalled).toBe(1);
  });

  it('both controls block every malicious package and reveal the flag', () => {
    const r = runInstall({ verifyHashes: true, scopeInternalRegistry: true });
    expect(r.maliciousInstalled).toBe(0);
    expect(r.clean).toBe(true);
    expect(r.flag).toBe('CTF{lockfile_caught_the_swap}');
  });
});

describe('provenance verification', () => {
  const pick = (id: string) => {
    const r = RELEASES.find((x) => x.id === id);
    if (!r) throw new Error(`no release ${id}`);
    return r;
  };

  it('trusts only the genuine release', () => {
    expect(verifyProvenance(pick('genuine')).trusted).toBe(true);
    expect(verifyProvenance(pick('tampered')).trusted).toBe(false);
    expect(verifyProvenance(pick('forged')).trusted).toBe(false);
  });

  it('fails the hash check on the tampered release and reveals the flag', () => {
    const r = verifyProvenance(pick('tampered'));
    expect(r.checks[0]?.pass).toBe(false);
    expect(r.flag).toBe('CTF{provenance_rejected_the_tamper}');
  });

  it('fails signature and builder checks on the forged release', () => {
    const r = verifyProvenance(pick('forged'));
    expect(r.checks[1]?.pass).toBe(false);
    expect(r.checks[2]?.pass).toBe(false);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('supply-chain-provenance');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('sc-dep-flag', 'CTF{lockfile_caught_the_swap}')).toBe(true);
    expect(accepts('sc-prov-flag', 'CTF{provenance_rejected_the_tamper}')).toBe(true);
    expect(accepts('sc-confusion', 'dependency confusion')).toBe(true);
    expect(accepts('sc-sbom', 'sbom')).toBe(true);
    expect(accepts('sc-provenance-term', 'provenance')).toBe(true);
    // Sanity: at least one malicious dependency exists to defend against.
    expect(DEPENDENCIES.some((d) => d.malicious)).toBe(true);
  });
});
