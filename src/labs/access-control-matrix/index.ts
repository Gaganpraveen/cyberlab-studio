import { Table } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const accessControlLab: LabDefinition = {
  id: 'access-control-matrix',
  title: 'Broken Access Control',
  tagline:
    'Exploit IDOR and privilege escalation against a weak authorization policy, then fix it with ownership and role checks.',
  description:
    'Walk an access-control matrix of users and resources. The starting policy only checks that a caller is logged in, so a normal user can read another user&rsquo;s private object (IDOR) and reach an admin-only endpoint (privilege escalation). Turn on the ownership and role checks and watch the matrix lock down as access control is enforced.',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  mode: 'simulation',
  engine: 'Deterministic authorization model (access-control matrix)',
  topicIds: ['IAM-06', 'IAM-01', 'APP-06'],
  icon: Table,
  objectives: [
    'Read an access-control matrix of subjects, objects, and permissions',
    'Exploit an insecure direct object reference (IDOR) across user accounts',
    'Exploit a missing role check to escalate to an admin-only resource',
    'Enforce object ownership to close broken object-level authorization',
    'Enforce role-based access control to lock down the matrix',
  ],
  component: lazy(() => import('./AccessControlLab')),
  challenges,
};
