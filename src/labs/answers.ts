import { sha256Hex } from '@/lib/sha256';

import type { ChallengeDefinition } from './types';

/**
 * Normalize a submitted answer before hashing: trim, collapse whitespace and
 * lowercase. Flags keep their case-insensitive CTF{...} shape.
 */
export function normalizeAnswer(input: string): string {
  return input.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function hashAnswer(input: string): string {
  return sha256Hex(normalizeAnswer(input));
}

export function checkAnswer(challenge: ChallengeDefinition, input: string): boolean {
  if (!challenge.acceptedHashes || challenge.acceptedHashes.length === 0) return false;
  const digest = hashAnswer(input);
  return challenge.acceptedHashes.includes(digest);
}
