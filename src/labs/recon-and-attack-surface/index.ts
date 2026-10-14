import { Radar } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const reconAttackSurfaceLab: LabDefinition = {
  id: 'recon-and-attack-surface',
  title: 'Recon and Attack Surface',
  tagline:
    'Map a fictional organization from open-source intelligence, then shrink its internet-facing attack surface to the minimum.',
  description:
    'Map a fictional organization from open-source intelligence, then shrink its internet-facing attack surface to the minimum.',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  mode: 'simulation',
  engine: 'Deterministic model over a fictional example.test organization',
  topicIds: ['FND-04', 'NET-02'],
  icon: Radar,
  objectives: [
    'Assemble a host footprint from DNS, certificate logs, job posts, and code leaks',
    'Recognize that reconnaissance is the first phase of the attack lifecycle',
    'Find an internal host leaked to the internet through a certificate-transparency log',
    'Measure an attack surface and reduce it by removing exposure, not just patching it',
    'Design a minimal-exposure posture: only intended public hosts and low-risk ports',
  ],
  component: lazy(() => import('./ReconLab')),
  challenges,
};
