// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  CAESAR_CIPHERTEXT,
  CAESAR_FLAG,
  CAESAR_PLAINTEXT,
  ENGLISH_IC,
  VIGENERE_CIPHERTEXT,
  VIGENERE_FLAG,
  VIGENERE_KEY,
  VIGENERE_PLAINTEXT,
  breakCaesar,
  caesarShift,
  guessKeyLength,
  indexOfCoincidence,
  recoverKey,
  solveVigenere,
  vigenereDecrypt,
  vigenereEncrypt,
} from './engine';

describe('caesar', () => {
  it('round-trips and the ciphertext is not the plaintext', () => {
    expect(caesarShift(caesarShift('HELLO', 7), 26 - 7)).toBe('HELLO');
    expect(CAESAR_CIPHERTEXT).not.toBe(CAESAR_PLAINTEXT);
  });

  it('is broken by trying all shifts and scoring against English', () => {
    const { best } = breakCaesar(CAESAR_CIPHERTEXT);
    expect(best.text).toBe(CAESAR_PLAINTEXT);
    expect(best.text).toContain(CAESAR_FLAG);
  });
});

describe('index of coincidence', () => {
  it('is near the English value for real text and lower for the ciphertext', () => {
    expect(indexOfCoincidence(VIGENERE_PLAINTEXT)).toBeGreaterThan(0.06);
    // A polyalphabetic cipher flattens the distribution toward random (~0.038).
    expect(indexOfCoincidence(VIGENERE_CIPHERTEXT)).toBeLessThan(ENGLISH_IC);
  });
});

describe('vigenere', () => {
  it('round-trips', () => {
    expect(vigenereDecrypt(vigenereEncrypt('ATTACK AT DAWN', 'LEMON'), 'LEMON')).toBe(
      'ATTACK AT DAWN',
    );
  });

  it('recovers the key length from the index of coincidence', () => {
    expect(guessKeyLength(VIGENERE_CIPHERTEXT, 12)).toBe(VIGENERE_KEY.length);
  });

  it('recovers the exact key by frequency analysis per column', () => {
    expect(recoverKey(VIGENERE_CIPHERTEXT, VIGENERE_KEY.length)).toBe(VIGENERE_KEY);
  });

  it('fully solves to the original plaintext and flag', () => {
    const solution = solveVigenere(VIGENERE_CIPHERTEXT, 12);
    expect(solution.keyLength).toBe(VIGENERE_KEY.length);
    expect(solution.key).toBe(VIGENERE_KEY);
    expect(solution.plaintext).toBe(VIGENERE_PLAINTEXT);
    expect(solution.plaintext).toContain(VIGENERE_FLAG);
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('classical-cipher-breaker');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('cipher-freq', 'e')).toBe(true);
    expect(accepts('cipher-caesar-flag', CAESAR_FLAG)).toBe(true);
    expect(accepts('cipher-key-length', String(VIGENERE_KEY.length))).toBe(true);
    expect(accepts('cipher-vigenere-key', VIGENERE_KEY)).toBe(true);
    expect(accepts('cipher-vigenere-flag', VIGENERE_FLAG)).toBe(true);
  });
});
