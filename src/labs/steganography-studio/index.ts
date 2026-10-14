import { ScanLine } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const steganographyStudioLab: LabDefinition = {
  id: 'steganography-studio',
  title: 'Steganography and Metadata Studio',
  tagline:
    "Hide a message in an image's least-significant bits, extract a hidden flag, and read the EXIF metadata that leaks secrets.",
  description:
    'Two ways data hides inside an image, both hands-on and reversible. The steganography tab runs a real LSB codec: embed a message in the least-significant bit of each colour byte (invisible to the eye), toggle the LSB plane to see the hidden-data layer, and extract a flag from a suspicious-looking carrier. The metadata tab inspects EXIF-style fields — GPS coordinates, author identity, and a comment holding a leaked key. The lesson is the CRY-01 one: steganography encodes and hides, it does not encrypt and protect, so anyone who suspects the carrier can read the secret.',
  difficulty: 'intermediate',
  estimatedMinutes: 20,
  mode: 'simulation',
  engine: 'Real LSB steganography codec + metadata inspector',
  topicIds: ['FOR-02', 'CRY-01'],
  icon: ScanLine,
  objectives: [
    'Embed and extract a message with least-significant-bit steganography',
    'Visualize the LSB plane and see why the carrier looks unchanged',
    'Recover a hidden flag from a suspicious image',
    'Inspect EXIF metadata and find leaked GPS, author, and secret fields',
    'Explain why hiding (encoding) is not the same as protecting (encryption)',
  ],
  component: lazy(() => import('./SteganographyLab')),
  challenges,
};
