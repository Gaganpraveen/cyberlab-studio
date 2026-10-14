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
  objectives: [],
  status: 'in-development',
  component: lazy(() => import('./DdosLab')),
  challenges,
};
