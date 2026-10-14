import { FileKey } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const osPermissionsLab: LabDefinition = {
  id: 'os-permissions',
  title: 'Unix Permissions and Privilege Escalation',
  tagline:
    'Read octal modes, escalate to root through a world-writable script, read world-readable hashes, then chmod it right.',
  description:
    'A fake filesystem with real Unix permission semantics. As a low-privileged user, escalate to root by overwriting a world-writable script that root runs on a schedule, and read password hashes from a world-readable /etc/shadow. Then use chmod to apply least privilege and watch both paths close. Learn to read symbolic and octal modes and spot the setuid bit.',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  mode: 'simulation',
  engine: 'Deterministic Unix permission model',
  topicIds: ['SYS-04', 'SYS-05'],
  icon: FileKey,
  objectives: [
    'Read Unix permissions in both octal and symbolic (rwx) form',
    'Escalate to root by overwriting a world-writable, root-run script',
    'Read a world-readable /etc/shadow to harvest password hashes',
    'Apply least-privilege modes with chmod to close both paths',
    'Recognize the setuid bit and why it is a privilege-escalation target',
  ],
  component: lazy(() => import('./OsPermissionsLab')),
  challenges,
};
