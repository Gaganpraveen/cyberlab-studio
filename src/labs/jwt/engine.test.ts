// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  SERVER_SECRET,
  SESSION_PAYLOAD,
  WEAK_SECRETS,
  bytesToB64url,
  b64urlToBytes,
  crackSecret,
  decodeJwt,
  forgeUnsignedJwt,
  gradeVerifier,
  signJwt,
  tamperPayload,
  verifyStrict,
  verifyVulnerable,
} from './engine';

describe('base64url', () => {
  it('round-trips bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(Array.from(b64urlToBytes(bytesToB64url(bytes)))).toEqual(Array.from(bytes));
  });
});

describe('decode', () => {
  it('reads the payload without a secret (JWT is not encrypted)', async () => {
    const token = await signJwt(SESSION_PAYLOAD, SERVER_SECRET);
    const decoded = decodeJwt(token);
    expect(decoded.valid).toBe(true);
    expect(decoded.payload.role).toBe('student');
  });
});

describe('alg: none forgery', () => {
  it('is accepted by the vulnerable verifier', async () => {
    const forged = forgeUnsignedJwt({ ...SESSION_PAYLOAD, role: 'admin' });
    const result = await verifyVulnerable(forged, SERVER_SECRET);
    expect(result.valid).toBe(true);
    expect(result.payload?.role).toBe('admin');
  });

  it('is rejected by the strict verifier', async () => {
    const forged = forgeUnsignedJwt({ ...SESSION_PAYLOAD, role: 'admin' });
    const result = await verifyStrict(forged, SERVER_SECRET);
    expect(result.valid).toBe(false);
  });
});

describe('tampering', () => {
  it('breaks the signature, so both verifiers reject it', async () => {
    const token = await signJwt(SESSION_PAYLOAD, SERVER_SECRET);
    const tampered = tamperPayload(token, { role: 'admin' });
    expect((await verifyVulnerable(tampered, SERVER_SECRET)).valid).toBe(false);
    expect((await verifyStrict(tampered, SERVER_SECRET)).valid).toBe(false);
  });
});

describe('weak secret', () => {
  it('is found in the wordlist', async () => {
    const token = await signJwt(SESSION_PAYLOAD, SERVER_SECRET);
    expect(await crackSecret(token, WEAK_SECRETS)).toBe(SERVER_SECRET);
  });

  it('lets an attacker forge a token that even the strict verifier accepts', async () => {
    const token = await signJwt(SESSION_PAYLOAD, SERVER_SECRET);
    const cracked = await crackSecret(token, WEAK_SECRETS);
    expect(cracked).not.toBeNull();
    const forged = await signJwt({ ...SESSION_PAYLOAD, role: 'admin' }, cracked!);
    const result = await verifyStrict(forged, SERVER_SECRET);
    expect(result.valid).toBe(true);
    expect(result.payload?.role).toBe('admin');
  });

  it('returns null when the secret is not in the list', async () => {
    const token = await signJwt(SESSION_PAYLOAD, 'a-long-random-secret-not-listed');
    expect(await crackSecret(token, WEAK_SECRETS)).toBeNull();
  });
});

describe('grading', () => {
  it('the vulnerable verifier fails the battery', async () => {
    const report = await gradeVerifier('vulnerable', SERVER_SECRET);
    expect(report.secure).toBe(false);
  });

  it('the strict verifier passes the battery', async () => {
    const report = await gradeVerifier('strict', SERVER_SECRET);
    expect(report.secure).toBe(true);
    expect(report.passed).toBe(report.total);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('jwt');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('jwt-read-role', 'student')).toBe(true);
    expect(accepts('jwt-crack-secret', SERVER_SECRET)).toBe(true);
    expect(accepts('jwt-defense', 'the alg header')).toBe(true);
  });
});
