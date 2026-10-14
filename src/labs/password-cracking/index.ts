import { KeyRound } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const passwordCrackingLab: LabDefinition = {
  id: 'password-cracking',
  title: 'Password Cracking and Hashing',
  tagline: 'Crack a leaked table of fast, unsalted hashes, then see how salting and slow key derivation change the cost.',
  description: 'Crack a leaked table of fast, unsalted hashes, then see how salting and slow key derivation change the cost.',
  difficulty: 'beginner',
  estimatedMinutes: 30,
  mode: 'real',
  engine: 'SHA-256 and PBKDF2 via the Web Crypto API',
  topicIds: ['CRY-01', 'CRY-05', 'IAM-02'],
  icon: KeyRound,
  objectives: [],
  component: lazy(() => import('./PasswordLab')),
  challenges,
};
