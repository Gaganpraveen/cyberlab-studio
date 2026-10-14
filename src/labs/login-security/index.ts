import { LogIn } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const loginSecurityLab: LabDefinition = {
  id: 'login-security',
  title: 'Login Under Attack',
  tagline:
    'Run a dictionary attack on a weak login, then stop the same attack with rate limiting, lockout, and MFA — and close a username leak.',
  description:
    'Attack a login endpoint online, not offline: run a dictionary attack — a wordlist of common passwords — against a reused weak password with no throttling and walk straight in. Then watch rate limiting, account lockout, and multi-factor authentication each stop the same attack, and see how verbose error messages leak which usernames exist until generic errors close the gap.',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  mode: 'simulation',
  engine: 'Deterministic login-endpoint model',
  topicIds: ['IAM-02', 'IAM-03'],
  icon: LogIn,
  objectives: [
    'Run a dictionary attack against a weak, reused password',
    'Stop online guessing with per-account rate limiting',
    'Stop sustained guessing with account lockout, and weigh its DoS risk',
    'Defeat a correct-password attack with multi-factor authentication',
    'Recognize and close username enumeration in login responses',
  ],
  component: lazy(() => import('./LoginSecurityLab')),
  challenges,
};
