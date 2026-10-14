import { KeyRound } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const classicalCipherLab: LabDefinition = {
  id: 'classical-cipher-breaker',
  title: 'Classical Cipher Breaker',
  tagline:
    'Break a Caesar shift by brute force and a Vigenere cipher with the index of coincidence and frequency analysis.',
  description:
    'Do real cryptanalysis in the browser: break a Caesar cipher by scoring all 26 shifts against English letter frequencies, then break a Vigenere cipher by recovering its key length from the index of coincidence and its keyword column by column. The lab shows why monoalphabetic and short repeating-key ciphers leak the very frequencies they try to hide.',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  mode: 'real',
  engine: 'Frequency analysis and index of coincidence in TypeScript',
  topicIds: ['CRY-01', 'CRY-02'],
  icon: KeyRound,
  objectives: [
    'Read a letter-frequency fingerprint and recognize English in it',
    'Break a Caesar cipher by scoring all 26 shifts automatically',
    'Use the index of coincidence to recover a Vigenere key length',
    'Recover a Vigenere keyword by solving each column as a Caesar shift',
    'Explain why a repeating key leaks frequencies within each column',
  ],
  component: lazy(() => import('./ClassicalCipherLab')),
  challenges,
};
