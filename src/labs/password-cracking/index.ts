import { KeyRound } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const passwordCrackingLab: LabDefinition = {
  id: 'password-cracking',
  title: 'Password Cracking and Hashing',
  tagline:
    'Crack a leaked table of fast, unsalted hashes, then see how salting and slow key derivation change the cost.',
  description:
    'Crack a leaked table of fast, unsalted hashes, then see how salting and slow key derivation change the cost.',
  difficulty: 'beginner',
  estimatedMinutes: 30,
  mode: 'real',
  engine: 'SHA-256 and PBKDF2 via the Web Crypto API',
  topicIds: ['CRY-01', 'CRY-05', 'IAM-02'],
  icon: KeyRound,
  objectives: [
    'Crack a table of unsalted fast hashes with a wordlist',
    'Recognize password reuse from identical hashes',
    'Explain why a per-user salt defeats precomputed tables',
    'Compare the attack cost of fast hashing versus a slow KDF',
    'Re-store passwords with salted PBKDF2 to make cracking impractical',
  ],
  component: lazy(() => import('./PasswordLab')),
  challenges,
};
