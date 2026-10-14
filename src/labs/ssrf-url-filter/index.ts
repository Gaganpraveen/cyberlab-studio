import { Globe } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const ssrfUrlFilterLab: LabDefinition = {
  id: 'ssrf-url-filter',
  title: 'Server-Side Request Forgery',
  tagline:
    'Make a server fetch internal URLs to steal cloud credentials and reach loopback admins, then filter it right.',
  description:
    'A server-side URL fetcher trusts whatever URL you give it. Point it at the cloud metadata endpoint to steal credentials, at a loopback admin panel, and at a benign-looking hostname that resolves to an internal address. Then add the controls that stop it: resolve the host and refuse internal IP ranges, and allowlist known destinations.',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  mode: 'simulation',
  engine: 'Deterministic URL fetcher, DNS, and internal network',
  topicIds: ['APP-05', 'APP-02'],
  icon: Globe,
  objectives: [
    'Reach the cloud metadata endpoint to steal instance credentials',
    'Reach a loopback-bound internal admin panel through the server',
    'See a benign hostname resolve to an internal IP and defeat string blocklists',
    'Refuse internal IP ranges by validating the resolved address',
    'Allowlist known destinations as the strongest control',
  ],
  component: lazy(() => import('./SsrfUrlFilterLab')),
  challenges,
};
