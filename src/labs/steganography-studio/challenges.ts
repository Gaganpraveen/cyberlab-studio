import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { META_FLAG, STEG_FLAG } from './engine';

const lab = 'steganography-studio';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'steg-flag',
    labId: lab,
    title: 'Extract the hidden message',
    difficulty: 'intermediate',
    points: 25,
    kind: 'flag',
    topicIds: ['CRY-01'],
    prompt:
      'The suspicious image looks ordinary, but a message is hidden in its pixels. Run the LSB extractor and submit the flag it recovers.',
    hints: [
      'The data is in the least-significant bit of each colour byte — invisible to the eye.',
      'Load the suspicious image and click Extract.',
    ],
    acceptedHashes: [hashAnswer(STEG_FLAG)],
    solution: `Least-significant-bit steganography stores one bit of the message in the lowest bit of each colour byte, changing each pixel by at most one step — invisible to the eye but trivial to read if you know where to look. The flag is **${STEG_FLAG}**. Note that it was *hidden*, not *encrypted*: anyone who suspects the carrier can read it.`,
  },
  {
    id: 'meta-flag',
    labId: lab,
    title: 'Read the leaked metadata',
    difficulty: 'beginner',
    points: 20,
    kind: 'flag',
    topicIds: ['FOR-02'],
    prompt:
      'The image file carries EXIF-style metadata. One field holds a secret that should never have shipped. Find it and submit the flag.',
    hints: [
      'Metadata travels with the file: camera, time, location, and free-text comments.',
      'Read the UserComment field.',
    ],
    acceptedHashes: [hashAnswer(META_FLAG)],
    solution: `Metadata rides along inside the file. A **UserComment** field here holds a staging backup key — a secret pasted into a comment and shipped with the photo. The flag is **${META_FLAG}**. Always strip metadata before publishing images: it leaks location, author, software, and whatever careless notes got left in it.`,
  },
  {
    id: 'steg-roundtrip',
    labId: lab,
    title: 'Hide and recover your own message',
    difficulty: 'beginner',
    points: 15,
    kind: 'task',
    topicIds: ['CRY-01'],
    prompt:
      'Type a message, embed it into the carrier image, then extract it again and confirm it comes back unchanged. The lab marks this solved after a successful round trip.',
    hints: [
      'Embed writes your message into the LSBs; Extract reads it back.',
      'The recovered text should match exactly what you typed.',
    ],
    solution:
      'A clean round trip proves the codec is lossless: the embedded bits come back byte-for-byte. The carrier looks identical before and after because each byte changed by at most one. That invisibility is steganography&rsquo;s whole point — and its danger, since the channel is easy to miss.',
  },
  {
    id: 'steg-not-encryption',
    labId: lab,
    title: 'Hiding vs. protecting',
    difficulty: 'intermediate',
    points: 10,
    kind: 'answer',
    topicIds: ['CRY-01'],
    prompt:
      'Steganography hides the *existence* of a message. What technique hides its *contents*, so that finding it still reveals nothing? (One word.)',
    hints: ['Steganography is obscurity; this is protection.', 'It needs a key.'],
    acceptedHashes: [
      hashAnswer('encryption'),
      hashAnswer('cryptography'),
      hashAnswer('encrypting'),
    ],
    solution:
      '**Encryption** protects contents: without the key, a recovered ciphertext is useless. Steganography only hides that a message exists. The strong combination is to encrypt first, then hide the ciphertext — obscurity buys time, encryption buys security.',
  },
  {
    id: 'steg-lsb',
    labId: lab,
    title: 'Name the carrier bit',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['CRY-01'],
    prompt:
      'This lab hides data in the lowest-value bit of each colour byte, so the image barely changes. What is that bit called? (Three-letter acronym or its full name.)',
    hints: ['It changes a byte&rsquo;s value by at most one.', 'Least Significant Bit.'],
    acceptedHashes: [
      hashAnswer('LSB'),
      hashAnswer('least significant bit'),
      hashAnswer('the least significant bit'),
    ],
    solution:
      'The **LSB** (least significant bit) carries a value of 1, so flipping it changes a 0–255 colour by at most one step — imperceptible. Storing one message bit per byte is the simplest steganography, and detectable statistically (the LSB plane stops looking like natural noise).',
  },
  {
    id: 'meta-gps',
    labId: lab,
    title: 'Name the location leak',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['FOR-02'],
    prompt:
      'Which metadata fields reveal exactly where a photo was taken, a classic privacy and opsec leak? (Three-letter acronym, or the word for it.)',
    hints: ['Latitude and longitude.', 'Global Positioning System.'],
    acceptedHashes: [
      hashAnswer('GPS'),
      hashAnswer('gps coordinates'),
      hashAnswer('geolocation'),
      hashAnswer('location'),
    ],
    solution:
      '**GPS** latitude/longitude tags embed the capture location in the file. Posting an un-stripped photo can reveal a home, a base, or a safehouse. Platforms often strip these on upload, but files shared directly keep them — so strip metadata yourself before sharing.',
  },
];
