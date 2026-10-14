// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import {
  CHALLENGE_STEGO,
  IMAGE_METADATA,
  META_FLAG,
  STEG_FLAG,
  decodeMessage,
  encodeMessage,
  leakyFields,
  makeCarrier,
} from './engine';

describe('LSB steganography codec', () => {
  it('round-trips an arbitrary message', () => {
    const carrier = makeCarrier(4096);
    const { stego } = encodeMessage(carrier, 'attack at dawn — 2026');
    expect(decodeMessage(stego)).toBe('attack at dawn — 2026');
  });

  it('only touches the least-significant bit of each changed byte', () => {
    const carrier = makeCarrier(512);
    const { stego } = encodeMessage(carrier, 'hi');
    for (let i = 0; i < carrier.length; i++) {
      // Every byte is unchanged except possibly its LSB.
      expect(stego[i]! & 0xfe).toBe(carrier[i]! & 0xfe);
    }
  });

  it('returns empty string when the carrier hides nothing meaningful', () => {
    // All-zero LSBs decode to a zero length -> no message.
    const clean = makeCarrier(256).map((v) => v & 0xfe);
    expect(decodeMessage(clean)).toBe('');
  });

  it('throws when the message is larger than the carrier', () => {
    expect(() => encodeMessage(makeCarrier(16), 'way too long for sixteen bytes')).toThrow();
  });

  it('the prebuilt challenge image hides the flag', () => {
    expect(decodeMessage(CHALLENGE_STEGO)).toBe(STEG_FLAG);
  });
});

describe('metadata forensics', () => {
  it('hides the flag in a leaky comment field', () => {
    const comment = IMAGE_METADATA.find((f) => f.key === 'UserComment');
    expect(comment?.value).toContain(META_FLAG);
  });

  it('flags GPS and author fields as leaks', () => {
    const keys = leakyFields().map((f) => f.key);
    expect(keys).toContain('GPSLatitude');
    expect(keys).toContain('UserComment');
    expect(keys).not.toContain('Make');
  });
});

describe('challenges', () => {
  it('are well-formed and answerable', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('steganography-studio');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
    const map = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      map[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('steg-flag', STEG_FLAG)).toBe(true);
    expect(accepts('meta-flag', META_FLAG)).toBe(true);
    expect(accepts('steg-not-encryption', 'encryption')).toBe(true);
    expect(accepts('steg-lsb', 'least significant bit')).toBe(true);
    expect(accepts('meta-gps', 'GPS')).toBe(true);
  });
});
