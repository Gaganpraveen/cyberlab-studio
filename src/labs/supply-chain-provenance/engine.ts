/**
 * A deterministic model of two software-supply-chain defenses: dependency
 * integrity (lockfile hash pinning and private-registry scoping) and release
 * artifact provenance (verifying that a build artifact matches a signed
 * attestation from a trusted builder). Nothing is installed or executed — the
 * dependency set and the release artifacts are fixed fixtures — so the learner
 * can watch two supply-chain attacks succeed and then enable the controls that
 * catch them.
 *
 * Attack 1 (dependencies): an internal package name is resolved from the public
 * registry (dependency confusion) and a pinned package's tarball is swapped
 * after the lockfile was written (tampered artifact). Attack 2 (provenance): a
 * tampered release and a forged-builder release are published; verifying the
 * provenance attestation rejects both.
 */

export const DEP_FLAG = 'CTF{lockfile_caught_the_swap}';
export const PROVENANCE_FLAG = 'CTF{provenance_rejected_the_tamper}';

export type Registry = 'internal' | 'public';

export interface Dependency {
  name: string;
  version: string;
  /** Where the resolver actually pulled it from. */
  registry: Registry;
  /** Where it should come from. */
  expectedRegistry: Registry;
  /** Hash pinned in the lockfile (empty = never pinned, a red flag for internal names). */
  lockHash: string;
  /** Hash of the tarball that was actually resolved. */
  resolvedHash: string;
  /** Ground truth. */
  malicious: boolean;
  note: string;
}

export const DEPENDENCIES: Dependency[] = [
  {
    name: 'react',
    version: '18.3.1',
    registry: 'public',
    expectedRegistry: 'public',
    lockHash: 'sha256:a1b2c3',
    resolvedHash: 'sha256:a1b2c3',
    malicious: false,
    note: 'Public package, hash matches the lockfile.',
  },
  {
    name: '@acme/auth',
    version: '9.9.9',
    registry: 'public',
    expectedRegistry: 'internal',
    lockHash: '',
    resolvedHash: 'sha256:e4e4e4',
    malicious: true,
    note: 'Dependency confusion: an internal package name resolved from the public registry at an impossibly high version.',
  },
  {
    name: 'color-utils',
    version: '2.1.0',
    registry: 'public',
    expectedRegistry: 'public',
    lockHash: 'sha256:c3c3c3',
    resolvedHash: 'sha256:ff0000',
    malicious: true,
    note: 'Tampered artifact: the published tarball was swapped after the lockfile pinned its hash.',
  },
  {
    name: 'lodash',
    version: '4.17.21',
    registry: 'public',
    expectedRegistry: 'public',
    lockHash: 'sha256:d4d4d4',
    resolvedHash: 'sha256:d4d4d4',
    malicious: false,
    note: 'Public package, hash matches the lockfile.',
  },
];

export interface DepDefenses {
  /** Reject any package whose resolved hash differs from the pinned lock hash. */
  verifyHashes: boolean;
  /** Resolve internal names only from the private registry. */
  scopeInternalRegistry: boolean;
}

export const DEFAULT_DEP_DEFENSES: DepDefenses = {
  verifyHashes: false,
  scopeInternalRegistry: false,
};

export interface DepVerdict {
  dep: Dependency;
  isConfusion: boolean;
  isTampered: boolean;
  caught: boolean;
  installed: boolean;
  reason: string;
}

export function auditDependency(dep: Dependency, def: DepDefenses): DepVerdict {
  const isConfusion = dep.expectedRegistry === 'internal' && dep.registry === 'public';
  const isTampered = dep.lockHash !== '' && dep.resolvedHash !== dep.lockHash;
  const caughtByScope = isConfusion && def.scopeInternalRegistry;
  const caughtByHash = isTampered && def.verifyHashes;
  const caught = caughtByScope || caughtByHash;
  const installed = !caught;
  let reason: string;
  if (caughtByScope) reason = 'Blocked: internal name refused from the public registry.';
  else if (caughtByHash) reason = 'Blocked: resolved hash does not match the pinned lock hash.';
  else if (dep.malicious) reason = 'Installed — malicious package slipped through.';
  else reason = 'Installed — verified clean.';
  return { dep, isConfusion, isTampered, caught, installed, reason };
}

export interface InstallReport {
  verdicts: DepVerdict[];
  maliciousTotal: number;
  maliciousBlocked: number;
  maliciousInstalled: number;
  clean: boolean;
  flag?: string;
}

export function runInstall(def: DepDefenses): InstallReport {
  const verdicts = DEPENDENCIES.map((d) => auditDependency(d, def));
  const maliciousTotal = DEPENDENCIES.filter((d) => d.malicious).length;
  const maliciousInstalled = verdicts.filter((v) => v.dep.malicious && v.installed).length;
  const maliciousBlocked = maliciousTotal - maliciousInstalled;
  const clean = maliciousInstalled === 0;
  return {
    verdicts,
    maliciousTotal,
    maliciousBlocked,
    maliciousInstalled,
    clean,
    ...(clean ? { flag: DEP_FLAG } : {}),
  };
}

export const TRUSTED_BUILDER = 'github-actions://acme/release';
/** The source repository a genuine release must be built from (SLSA source match). */
export const EXPECTED_SOURCE_REPO = 'acme/app';

export interface ReleaseArtifact {
  id: string;
  name: string;
  /** Hash of the artifact bytes on the mirror. */
  artifactHash: string;
  /** Hash the signed provenance attests to. */
  attestedHash: string;
  sourceRepo: string;
  sourceCommit: string;
  builder: string;
  /** Does the attestation signature verify against the trusted builder's key? */
  signatureValid: boolean;
  malicious: boolean;
  label: string;
}

export const RELEASES: ReleaseArtifact[] = [
  {
    id: 'genuine',
    name: 'acme-app-2.4.0.tar.gz',
    artifactHash: 'sha256:9f9f9f',
    attestedHash: 'sha256:9f9f9f',
    sourceRepo: 'acme/app',
    sourceCommit: 'a1b2c3d',
    builder: TRUSTED_BUILDER,
    signatureValid: true,
    malicious: false,
    label: 'Official release from CI',
  },
  {
    id: 'tampered',
    name: 'acme-app-2.4.0.tar.gz',
    artifactHash: 'sha256:deadbe',
    attestedHash: 'sha256:9f9f9f',
    sourceRepo: 'acme/app',
    sourceCommit: 'a1b2c3d',
    builder: TRUSTED_BUILDER,
    signatureValid: true,
    malicious: true,
    label: 'Same name, bytes swapped on the mirror',
  },
  {
    id: 'forged',
    name: 'acme-app-2.4.0.tar.gz',
    artifactHash: 'sha256:777777',
    attestedHash: 'sha256:777777',
    sourceRepo: 'evil/fork',
    sourceCommit: '0000000',
    builder: 'laptop://attacker',
    signatureValid: false,
    malicious: true,
    label: 'Self-built, self-signed by an untrusted builder',
  },
];

export interface ProvenanceCheck {
  label: string;
  pass: boolean;
}

export interface ProvenanceResult {
  checks: ProvenanceCheck[];
  trusted: boolean;
  summary: string;
  flag?: string;
}

/** Verify an artifact against its provenance attestation and the trusted builder. */
export function verifyProvenance(a: ReleaseArtifact): ProvenanceResult {
  const checks: ProvenanceCheck[] = [
    { label: 'Artifact hash matches the attested hash', pass: a.artifactHash === a.attestedHash },
    { label: 'Attestation signature is valid', pass: a.signatureValid },
    { label: 'Builder is on the trusted allowlist', pass: a.builder === TRUSTED_BUILDER },
    {
      label: `Build source is the expected repository (${EXPECTED_SOURCE_REPO})`,
      pass: a.sourceRepo === EXPECTED_SOURCE_REPO,
    },
  ];
  const trusted = checks.every((c) => c.pass);
  const summary = trusted
    ? 'Provenance verified: safe to deploy.'
    : 'Provenance check failed: refuse to deploy this artifact.';
  // The teaching flag is earned by watching provenance correctly reject a bad build.
  const flag = !trusted && a.malicious ? PROVENANCE_FLAG : undefined;
  return { checks, trusted, summary, ...(flag ? { flag } : {}) };
}
