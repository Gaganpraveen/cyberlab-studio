import { Database } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const sqlInjectionLab: LabDefinition = {
  id: 'sql-injection',
  title: 'SQL Injection: Attack and Fix',
  tagline:
    'Break into a fake login with SQL injection, dump a hidden table, then fix the query and prove the attack fails.',
  description:
    'Break into a fake login with SQL injection, dump a hidden table, then fix the query and prove the attack fails.',
  difficulty: 'beginner',
  estimatedMinutes: 40,
  mode: 'real',
  engine: 'SQLite 3 compiled to WebAssembly (sql.js)',
  topicIds: ['APP-01', 'APP-02'],
  icon: Database,
  objectives: [],
  status: 'in-development',
  component: lazy(() => import('./SqlInjectionLab')),
  challenges,
};
