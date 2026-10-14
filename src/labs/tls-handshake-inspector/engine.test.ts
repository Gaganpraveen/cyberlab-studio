// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  CERT_PIN_FLAG,
  EXPECTED_HOST,
  REFERENCE_NOW,
  SCENARIOS,
  type Ca,
  createCa,
  issueCert,
  verifyCert,
} from './engine';

const YEAR = 365 * 24 * 60 * 60 * 1000;

async function validLeaf(ca: Ca, subject = EXPECTED_HOST) {
  return issueCert({
    subject,
    notBefore: REFERENCE_NOW - YEAR,
    notAfter: REFERENCE_NOW + YEAR,
    ca,
  });
}

function policyFor(ca: Ca, extra: Partial<Parameters<typeof verifyCert>[1]> = {}) {
  return {
    trustedCaPublicKey: ca.publicKey,
    hostname: EXPECTED_HOST,
    now: REFERENCE_NOW,
    ...extra,
  };
}

describe('valid certificate', () => {
  it('passes every check when signed by the trusted CA for the right host in date', async () => {
    const ca = await createCa('Example Trust Root CA');
    const cert = await validLeaf(ca);
    const report = await verifyCert(cert, policyFor(ca));
    expect(report.signatureValid).toBe(true);
    expect(report.notExpired).toBe(true);
    expect(report.hostnameMatches).toBe(true);
    expect(report.pinOk).toBe(true);
    expect(report.ok).toBe(true);
    expect(report.reasons).toHaveLength(0);
  });
});

describe('expired certificate', () => {
  it('fails only the validity check — the signature is still from the trusted CA', async () => {
    const ca = await createCa('Example Trust Root CA');
    const cert = await issueCert({
      subject: EXPECTED_HOST,
      notBefore: REFERENCE_NOW - 2 * YEAR,
      notAfter: REFERENCE_NOW - YEAR,
      ca,
    });
    const report = await verifyCert(cert, policyFor(ca));
    expect(report.signatureValid).toBe(true);
    expect(report.notExpired).toBe(false);
    expect(report.ok).toBe(false);
  });
});

describe('hostname mismatch', () => {
  it('fails only the hostname check', async () => {
    const ca = await createCa('Example Trust Root CA');
    const cert = await validLeaf(ca, 'other.example.test');
    const report = await verifyCert(cert, policyFor(ca));
    expect(report.signatureValid).toBe(true);
    expect(report.notExpired).toBe(true);
    expect(report.hostnameMatches).toBe(false);
    expect(report.ok).toBe(false);
  });

  it('matches a single-label wildcard but not the bare domain or deeper names', async () => {
    const ca = await createCa('Example Trust Root CA');
    const cert = await validLeaf(ca, '*.example.test');
    expect((await verifyCert(cert, policyFor(ca, { hostname: 'shop.example.test' }))).hostnameMatches).toBe(true);
    expect((await verifyCert(cert, policyFor(ca, { hostname: 'example.test' }))).hostnameMatches).toBe(false);
    expect((await verifyCert(cert, policyFor(ca, { hostname: 'a.b.example.test' }))).hostnameMatches).toBe(false);
  });
});

describe('self-signed certificate', () => {
  it('fails the signature check against a trusted CA it does not chain to', async () => {
    const ca = await createCa('Example Trust Root CA');
    const cert = await issueCert({
      subject: EXPECTED_HOST,
      notBefore: REFERENCE_NOW - YEAR,
      notAfter: REFERENCE_NOW + YEAR,
      selfSigned: true,
    });
    const report = await verifyCert(cert, policyFor(ca));
    expect(report.signatureValid).toBe(false);
    expect(report.ok).toBe(false);
  });
});

describe('a cert signed by an untrusted CA', () => {
  it('fails the signature check against the client trust anchor', async () => {
    const trusted = await createCa('Example Trust Root CA');
    const rogueCa = await createCa('Rogue CA');
    const cert = await validLeaf(rogueCa);
    const report = await verifyCert(cert, policyFor(trusted));
    expect(report.signatureValid).toBe(false);
    expect(report.ok).toBe(false);
  });
});

describe('certificate pinning', () => {
  it('rejects a different valid cert for the same host when a key is pinned', async () => {
    const ca = await createCa('Example Trust Root CA');
    const genuine = await validLeaf(ca);
    const rogue = await validLeaf(ca); // same CA + host, fresh key => different fingerprint

    expect(genuine.fingerprint).not.toBe(rogue.fingerprint);

    // Without pinning, the rogue cert is fully valid.
    expect((await verifyCert(rogue, policyFor(ca))).ok).toBe(true);

    // Pin the genuine key: the genuine cert still passes, the rogue is refused.
    const pinned = policyFor(ca, { pinnedFingerprint: genuine.fingerprint });
    expect((await verifyCert(genuine, pinned)).ok).toBe(true);
    const rogueReport = await verifyCert(rogue, pinned);
    expect(rogueReport.pinOk).toBe(false);
    expect(rogueReport.ok).toBe(false);
  });
});

describe('scenarios', () => {
  it('cover the four validation outcomes exactly once', () => {
    const kinds = SCENARIOS.map((s) => s.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(new Set(kinds)).toEqual(
      new Set(['valid', 'expired', 'hostname-mismatch', 'self-signed']),
    );
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('tls-handshake-inspector');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('tls-trace', 'public key')).toBe(true);
    expect(accepts('tls-expired', 'validity period')).toBe(true);
    expect(accepts('tls-hostname', 'other.example.test')).toBe(true);
    expect(accepts('tls-pin', CERT_PIN_FLAG)).toBe(true);
  });
});
