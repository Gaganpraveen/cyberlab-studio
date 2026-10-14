// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  DEFAULT_DEFENSES,
  DEVELOPER,
  buildPolicy,
  evaluate,
  globMatch,
  tryEscalate,
  tryReadBucket,
} from './engine';

describe('glob matching', () => {
  it('matches wildcards the way IAM does', () => {
    expect(globMatch('iam:*', 'iam:AttachUserPolicy')).toBe(true);
    expect(globMatch('s3:GetObject', 's3:GetObject')).toBe(true);
    expect(globMatch('s3:GetObject', 's3:PutObject')).toBe(false);
    expect(globMatch('*', 'anything-at-all')).toBe(true);
    expect(globMatch('role/developers', '*')).toBe(false);
  });
});

describe('policy evaluation', () => {
  it('defaults to deny when nothing matches', () => {
    const d = evaluate(buildPolicy(DEFAULT_DEFENSES), {
      principal: 'role/nobody',
      action: 'ec2:TerminateInstances',
      resource: '*',
    });
    expect(d.effect).toBe('Deny');
  });

  it('an explicit Deny overrides a matching Allow', () => {
    // denyEscalation keeps the broad iam:* Allow but adds a Deny on self-escalation.
    const policy = buildPolicy({ ...DEFAULT_DEFENSES, denyEscalation: true });
    const d = evaluate(policy, {
      principal: DEVELOPER,
      action: 'iam:AttachUserPolicy',
      resource: '*',
    });
    expect(d.effect).toBe('Deny');
    expect(d.matchedSid).toBe('DenySelfEscalation');
  });
});

describe('attacks and fixes', () => {
  it('escalation and bucket read both succeed on the default policy', () => {
    expect(tryEscalate(DEFAULT_DEFENSES).success).toBe(true);
    expect(tryReadBucket(DEFAULT_DEFENSES).success).toBe(true);
  });

  it('scoping actions or an explicit Deny blocks escalation', () => {
    expect(tryEscalate({ ...DEFAULT_DEFENSES, scopeActions: true }).success).toBe(false);
    expect(tryEscalate({ ...DEFAULT_DEFENSES, denyEscalation: true }).success).toBe(false);
  });

  it('removing the public principal blocks the anonymous read', () => {
    expect(tryReadBucket({ ...DEFAULT_DEFENSES, removePublicPrincipal: true }).success).toBe(false);
  });

  it('reveals each flag only while its attack works', () => {
    expect(tryEscalate(DEFAULT_DEFENSES).flag).toBeTruthy();
    expect(tryReadBucket(DEFAULT_DEFENSES).flag).toBeTruthy();
    expect(tryEscalate({ ...DEFAULT_DEFENSES, scopeActions: true }).flag).toBeUndefined();
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('cloud-iam-policy');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('iam-escalate-flag', 'CTF{wildcard_iam_is_admin}')).toBe(true);
    expect(accepts('iam-bucket-flag', 'CTF{public_bucket_leaked_secrets}')).toBe(true);
    expect(accepts('iam-deny-wins', 'deny')).toBe(true);
    expect(accepts('iam-least-privilege', 'least privilege')).toBe(true);
  });
});
