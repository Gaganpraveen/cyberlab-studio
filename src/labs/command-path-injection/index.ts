import { Terminal } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const commandPathInjectionLab: LabDefinition = {
  id: 'command-path-injection',
  title: 'Command and Path Injection',
  tagline:
    'Chain a shell command through a ping tool and climb out of a web folder with ../, then shut both boundaries.',
  description:
    'Two boundary-escape flaws over a fake shell and a fake filesystem. Smuggle shell metacharacters through a ping tool to run arbitrary commands (command injection), then stop it by running the program with an argument array instead of a shell. Use ../ to read a file outside the intended directory (path traversal), then stop it by canonicalizing the path and confining it to a base directory.',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  mode: 'simulation',
  engine: 'Deterministic fake shell and filesystem',
  topicIds: ['APP-03', 'APP-04'],
  icon: Terminal,
  objectives: [
    'Run attacker-chosen commands by injecting shell metacharacters',
    'Neutralize command injection by executing with an argument array, no shell',
    'Read files outside a directory with ../ path traversal',
    'Confine file access by canonicalizing the path and checking the base directory',
    'Recognize that input allowlists are defense in depth, not the primary fix',
  ],
  component: lazy(() => import('./CommandPathInjectionLab')),
  challenges,
};
