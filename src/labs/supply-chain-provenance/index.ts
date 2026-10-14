import { PackageCheck } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const supplyChainProvenanceLab: LabDefinition = {
  id: 'supply-chain-provenance',
  title: 'Software Supply Chain and Provenance',
  tagline:
    'Watch a swapped dependency and a tampered release slip through, then catch them with lockfile hashes, registry scoping, and provenance.',
  description:
    'Two software-supply-chain attacks over fixed fixtures. On the dependencies tab, a tampered public tarball and a dependency-confusion package install silently until you verify lockfile hashes and scope internal names to a private registry. On the provenance tab, a tampered release and a forged-builder release are rejected by verifying the signed build attestation: the artifact hash must match, the signature must verify, and the builder must be trusted. Learn why modern defense is verify, not trust, and what an SBOM is for.',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  mode: 'simulation',
  engine: 'Deterministic dependency and provenance verifier',
  topicIds: ['CLD-07', 'CLD-06'],
  icon: PackageCheck,
  objectives: [
    'Spot a dependency-confusion package and a tampered tarball in an install',
    'Catch both with lockfile hash pinning and private-registry scoping',
    'Verify a release against its signed provenance attestation',
    'Reject a tampered artifact on a hash mismatch and a forged one on its builder',
    "Explain provenance, SBOMs, and the verify-don't-trust model",
  ],
  component: lazy(() => import('./SupplyChainLab')),
  challenges,
};
