import { Languages } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const homographLab: LabDefinition = {
  id: 'homograph',
  title: 'Homograph Domain Investigation',
  tagline: 'Spot look-alike domains by inspecting code points, scripts and Punycode, then build and evaluate a detection rule.',
  description: 'Spot look-alike domains by inspecting code points, scripts and Punycode, then build and evaluate a detection rule.',
  difficulty: 'beginner',
  estimatedMinutes: 35,
  mode: 'real',
  engine: 'Unicode and IDNA processing built into your browser',
  topicIds: ['WEB-01', 'WEB-02', 'WEB-03'],
  icon: Languages,
  objectives: [],
  component: lazy(() => import('./HomographLab')),
  challenges,
};
