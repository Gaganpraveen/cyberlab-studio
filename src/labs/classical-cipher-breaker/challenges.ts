import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { CAESAR_FLAG, VIGENERE_FLAG, VIGENERE_KEY } from './engine';

const lab = 'classical-cipher-breaker';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'cipher-freq',
    labId: lab,
    title: 'The giveaway letter',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['CRY-01'],
    prompt:
      'Frequency analysis works because every language has a fingerprint. **Which single letter is the most common in ordinary English text?** (One letter.)',
    hints: [
      'It is a vowel, and it appears in roughly one of every eight letters.',
      'Look at the tallest bar on the English-frequency chart.',
    ],
    acceptedHashes: [hashAnswer('e'), hashAnswer('the letter e'), hashAnswer('letter e')],
    solution:
      'The letter **E** is the most common in English, at about 12.7% of all letters — nearly twice the next (T). A cipher that maps each letter to one fixed substitute keeps this fingerprint intact: the most common ciphertext letter is almost always the encryption of E. That single fact is the crack that frequency analysis pries open.',
  },
  {
    id: 'cipher-caesar-break',
    labId: lab,
    title: 'Break the Caesar cipher',
    difficulty: 'beginner',
    points: 15,
    kind: 'task',
    topicIds: ['CRY-01', 'CRY-02'],
    prompt:
      'On the **Caesar** tab, break the shift cipher. Try all twenty-six shifts and let the frequency score find the one that turns the ciphertext back into English. The lab marks this solved once the winning shift is applied.',
    hints: [
      'There are only 26 possible shifts — a brute force is instant.',
      'The correct shift is the one whose decryption scores most like English.',
    ],
    solution:
      'A Caesar cipher has only 26 keys, so you can simply try them all. Scoring each candidate by how closely its letter frequencies match English (a chi-squared test) picks the right one automatically — you do not even need to read the output. The tiny key space, not the method, is what dooms it.',
  },
  {
    id: 'cipher-caesar-flag',
    labId: lab,
    title: 'Read the Caesar message',
    difficulty: 'beginner',
    points: 15,
    kind: 'flag',
    topicIds: ['CRY-01'],
    prompt: 'Once the Caesar cipher is broken, the plaintext contains a flag. Submit it.',
    hints: [
      'The flag has the shape CTF{...} and sits at the end of the decrypted message.',
      'Braces and underscores are not letters, so they pass through the cipher unchanged.',
    ],
    acceptedHashes: [hashAnswer(CAESAR_FLAG)],
    solution: `The decrypted message ends with **${CAESAR_FLAG}**. Notice that the braces and underscores were visible even in the ciphertext: a classical cipher only shifts letters, so punctuation leaks the shape of the hidden flag.`,
  },
  {
    id: 'cipher-key-length',
    labId: lab,
    title: 'Find the key length',
    difficulty: 'intermediate',
    points: 20,
    kind: 'answer',
    topicIds: ['CRY-02'],
    prompt:
      'On the **Vigenere** tab, run the index-of-coincidence analysis. **What key length does it reveal?** (A number.) At the true length, each column is a simple Caesar cipher and its statistics look like English again.',
    hints: [
      'The index of coincidence spikes toward 0.067 at multiples of the real key length.',
      'Pick the shortest length whose average column IC is closest to English.',
    ],
    acceptedHashes: [
      hashAnswer(String(VIGENERE_KEY.length)),
      hashAnswer(`${VIGENERE_KEY.length} letters`),
    ],
    solution: `The analysis points to a key length of **${VIGENERE_KEY.length}**. A repeating key means every ${VIGENERE_KEY.length}th letter was shifted by the same amount, so splitting the text into ${VIGENERE_KEY.length} columns turns each column back into a single-shift (Caesar) cipher — and its index of coincidence climbs back toward the English value of 0.067. Wrong lengths leave the columns looking random (about 0.038).`,
  },
  {
    id: 'cipher-vigenere-key',
    labId: lab,
    title: 'Recover the keyword',
    difficulty: 'intermediate',
    points: 25,
    kind: 'answer',
    topicIds: ['CRY-02'],
    prompt:
      'With the key length known, solve each column as a Caesar shift and read the keyword off one letter at a time. **What is the keyword?**',
    hints: [
      'Each column&rsquo;s best Caesar shift gives one letter of the key.',
      'The recovered letters spell an ordinary English word.',
    ],
    acceptedHashes: [hashAnswer(VIGENERE_KEY)],
    solution: `The keyword is **${VIGENERE_KEY}**. Because the key repeats, each column was enciphered with one fixed shift; solving that shift by frequency analysis yields one key letter, and the columns in order spell the word. This is exactly the attack that broke the &ldquo;indecipherable&rdquo; cipher in the 19th century.`,
  },
  {
    id: 'cipher-vigenere-flag',
    labId: lab,
    title: 'Read the Vigenere message',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['CRY-02'],
    prompt:
      'Decrypt the Vigenere ciphertext with the recovered key and submit the flag hidden in the plaintext.',
    hints: [
      'Use the Recover key and decrypt action, then read to the end of the message.',
      'The flag has the shape CTF{...}.',
    ],
    acceptedHashes: [hashAnswer(VIGENERE_FLAG)],
    solution: `The plaintext ends with **${VIGENERE_FLAG}** — a nod to the statistic that breaks the cipher. A repeating key only hides letter frequencies if you look at the whole message at once; sliced into key-length columns, the frequencies reappear and the key falls out.`,
  },
];
