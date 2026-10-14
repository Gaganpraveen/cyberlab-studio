import { Network } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const ddosLab: LabDefinition = {
  id: 'ddos',
  title: 'Botnet and DDoS Simulator',
  tagline:
    'Watch a fictional botnet overwhelm a small service, then tune rate limits and filters until real users get through.',
  description:
    'Watch a fictional botnet overwhelm a small service, then tune rate limits and filters until real users get through.',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  mode: 'simulation',
  engine: 'Seeded discrete-time queue model',
  topicIds: ['MAL-05', 'MAL-06', 'APP-08'],
  icon: Network,
  objectives: [
    'Explain how a denial-of-service attack exhausts a finite resource to deny availability',
    'Observe legitimate users get crowded out when a botnet floods a shared service',
    'Apply per-source rate limiting and measure the recovery in availability',
    'Contrast rate limiting with simply scaling up capacity against a large flood',
    'Describe why a distributed (DDoS) flood needs layered, upstream defenses',
  ],
  component: lazy(() => import('./DdosLab')),
  challenges,
};
