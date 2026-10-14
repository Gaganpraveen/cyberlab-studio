import { Fingerprint } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const jwtLab: LabDefinition = {
  id: 'jwt',
  title: 'JWT Forgery Workshop',
  tagline:
    'Decode a session token, forge one with alg=none and a weak secret, then harden the verifier.',
  description:
    'Decode a session token, forge one with alg=none and a weak secret, then harden the verifier.',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  mode: 'real',
  engine: 'HMAC-SHA256 in TypeScript and Web Crypto',
  topicIds: ['IAM-04', 'CRY-04'],
  icon: Fingerprint,
  objectives: [
    'Read a JWT and explain why signing is not encryption',
    'Forge an admin token with the alg: none trick',
    'Recover a weak HMAC secret from a wordlist',
    'Sign a token a strict verifier accepts, showing why secrets must be strong',
    'Harden a verifier by pinning the algorithm and requiring a signature',
  ],
  component: lazy(() => import('./JwtLab')),
  challenges,
};
