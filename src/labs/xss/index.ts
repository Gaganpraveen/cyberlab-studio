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
  objectives: [
    'Inject a script payload that executes in a vulnerable comment page',
    'Observe the attack fire safely inside an isolated sandbox',
    'Neutralize the payload with contextual output encoding (escaping)',
    'Explain why encoding belongs on output, in the right context',
    'Describe how a Content-Security-Policy adds a second layer of defense',
  ],
  component: lazy(() => import('./XssLab')),
  challenges,
};
