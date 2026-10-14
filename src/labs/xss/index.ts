import { CodeXml } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const xssLab: LabDefinition = {
  id: 'xss',
  title: 'Cross-Site Scripting Sandbox',
  tagline:
    'Inject script into a toy comment page running in an isolated sandbox, then fix the rendering so the payload stays inert.',
  description:
    'Inject script into a toy comment page running in an isolated sandbox, then fix the rendering so the payload stays inert.',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  mode: 'real',
  engine: 'Sandboxed iframe with no access to this app',
  topicIds: ['WEB-05', 'WEB-07'],
  icon: CodeXml,
  objectives: [],
  component: lazy(() => import('./XssLab')),
  challenges,
};
