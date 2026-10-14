/**
 * A deterministic model of two ways data hides inside an image file: LSB
 * steganography (hiding a message in the least-significant bit of each colour
 * byte) and leaked metadata (EXIF-style fields that spill secrets). The LSB
 * codec is real and reversible; it runs on a plain array of byte values so it
 * is identical whether a test drives it in Node or the UI drives it from a
 * canvas. Nothing is fetched or written to disk.
 *
 * The teaching point is the CRY-01 distinction: steganography hides the
 * *existence* of a message (obscurity), it does not protect its *contents*.
 * Only encryption does that. Anyone who suspects a carrier can extract the
 * payload, exactly as the learner does here.
 */

export const STEG_FLAG = 'CTF{hidden_in_plain_sight}';
export const META_FLAG = 'CTF{exif_spilled_the_secret}';

export function textToBytes(s: string): number[] {
  return Array.from(new TextEncoder().encode(s));
}

export function bytesToText(bytes: number[]): string {
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

function toBits(bytes: number[]): number[] {
  const bits: number[] = [];
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }
  return bits;
}

function fromBits(bits: number[]): number[] {
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] ?? 0);
    bytes.push(b);
  }
  return bytes;
}

/** 32-bit length header, so decode knows how many message bytes follow. */
const HEADER_BITS = 32;

export interface EncodeResult {
  stego: number[];
  /** How many message bytes the carrier can hold after the length header. */
  capacityBytes: number;
  usedBytes: number;
}

/** Embed a UTF-8 message in the LSBs of the carrier bytes. Throws if too large. */
export function encodeMessage(carrier: number[], message: string): EncodeResult {
  const msgBytes = textToBytes(message);
  const header = [
    (msgBytes.length >>> 24) & 0xff,
    (msgBytes.length >>> 16) & 0xff,
    (msgBytes.length >>> 8) & 0xff,
    msgBytes.length & 0xff,
  ];
  const payloadBits = toBits([...header, ...msgBytes]);
  const capacityBytes = Math.max(0, Math.floor((carrier.length - HEADER_BITS) / 8));
  if (payloadBits.length > carrier.length) {
    throw new Error(
      `message needs ${payloadBits.length} carrier bytes, only ${carrier.length} available`,
    );
  }
  const stego = carrier.slice();
  for (let i = 0; i < payloadBits.length; i++) {
    stego[i] = ((stego[i] ?? 0) & 0xfe) | (payloadBits[i] ?? 0);
  }
  return { stego, capacityBytes, usedBytes: msgBytes.length };
}

/** Extract a message previously embedded with encodeMessage. '' if none/garbage. */
export function decodeMessage(carrier: number[]): string {
  const lsbs = carrier.map((v) => v & 1);
  const headerBytes = fromBits(lsbs.slice(0, HEADER_BITS));
  const len =
    ((headerBytes[0] ?? 0) << 24) |
    ((headerBytes[1] ?? 0) << 16) |
    ((headerBytes[2] ?? 0) << 8) |
    (headerBytes[3] ?? 0);
  const maxBytes = Math.floor((carrier.length - HEADER_BITS) / 8);
  if (len <= 0 || len > maxBytes) return '';
  const msgBits = lsbs.slice(HEADER_BITS, HEADER_BITS + len * 8);
  try {
    return bytesToText(fromBits(msgBits));
  } catch {
    return '';
  }
}

/** A fixed, image-like carrier so the lab works without any real file. */
export function makeCarrier(n: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < n; i++) a.push((i * 37 + 11) & 0xff);
  return a;
}

export const CHALLENGE_CARRIER = makeCarrier(4096);
export const CHALLENGE_STEGO = encodeMessage(CHALLENGE_CARRIER, STEG_FLAG).stego;

export interface MetaField {
  key: string;
  value: string;
  /** This field leaks something it should not. */
  suspicious?: boolean;
  note?: string;
}

export const IMAGE_METADATA: MetaField[] = [
  { key: 'Make', value: 'FictionalCam' },
  { key: 'Model', value: 'FC-100 Pro' },
  { key: 'DateTimeOriginal', value: '2026:03:14 09:21:07' },
  { key: 'Software', value: 'PhotoKit 4.1' },
  {
    key: 'GPSLatitude',
    value: '37.42199 N',
    suspicious: true,
    note: 'Exact capture location — a privacy and operational-security leak.',
  },
  {
    key: 'GPSLongitude',
    value: '122.08400 W',
    suspicious: true,
    note: 'Pairs with the latitude to pin the spot on a map.',
  },
  {
    key: 'Artist',
    value: 'j.doe (badge 4471, internal)',
    suspicious: true,
    note: 'Author identity and an internal badge number.',
  },
  {
    key: 'UserComment',
    value: `staging backup key: ${META_FLAG}`,
    suspicious: true,
    note: 'A secret pasted into a comment field and shipped with the image.',
  },
];

/** The metadata fields that leak something they should not. */
export function leakyFields(): MetaField[] {
  return IMAGE_METADATA.filter((f) => f.suspicious);
}
