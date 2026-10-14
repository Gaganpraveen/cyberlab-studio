import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';

const lab = 'password-cracking';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'pw-crack-admin',
    labId: lab,
    title: 'Crack the admin',
    difficulty: 'beginner',
    points: 15,
    kind: 'answer',
    topicIds: ['CRY-05', 'IAM-02'],
    prompt:
      'The leaked table stores passwords as unsalted SHA-256 hashes. Run the wordlist attack on the Crack tab. **What was the `admin` account&rsquo;s password?**',
    hints: [
      'A fast hash of each wordlist entry is compared against every leaked hash.',
      'The admin picked something near the top of any common-password list.',
    ],
    acceptedHashes: [hashAnswer('password123')],
    solution:
      'The admin used **password123**. Because SHA-256 is fast and unsalted, an attacker hashes a wordlist once and matches it against the whole table in an instant. A general-purpose hash is the wrong tool for passwords precisely because it is fast.',
  },
  {
    id: 'pw-reuse',
    labId: lab,
    title: 'Spot the reuse',
    difficulty: 'beginner',
    points: 15,
    kind: 'answer',
    topicIds: ['CRY-05', 'IAM-02'],
    prompt:
      'With unsalted hashes, two accounts using the same password have the **same hash**. Besides `admin`, **which user** reused that same password? Give the username.',
    hints: [
      'Look for two rows in the leaked table whose hash is identical.',
      'The duplicate hash matches the admin&rsquo;s.',
    ],
    acceptedHashes: [hashAnswer('m.okoro'), hashAnswer('okoro')],
    solution:
      'The user **m.okoro** reused password123, which is obvious because the two hashes are identical. Unsalted hashing leaks this: you can see who shares a password without even cracking it. Salting removes the giveaway.',
  },
  {
    id: 'pw-uncracked',
    labId: lab,
    title: 'The one that held',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['CRY-05'],
    prompt:
      'One account&rsquo;s password was **not** in the wordlist, so the attack could not recover it. **Which user** resisted the crack? Give the username.',
    hints: [
      'After running the attack, one row shows no recovered password.',
      'Their password is long and not a common word.',
    ],
    acceptedHashes: [hashAnswer('s.patel'), hashAnswer('patel')],
    solution:
      'The user **s.patel** chose a long, uncommon passphrase, so it is not in the wordlist and the dictionary attack fails. Cracking only finds guesses on the list; length and unpredictability are what defeat it.',
  },
  {
    id: 'pw-salt',
    labId: lab,
    title: 'Why salt',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['CRY-05'],
    prompt:
      'A **salt** is a unique random value stored with each password hash. In a few words, **what does salting prevent** an attacker from doing?',
    hints: [
      'Think about the single shared table the unsalted attack built.',
      'It is about reusing precomputed work across accounts (rainbow tables).',
    ],
    acceptedHashes: [
      hashAnswer('precomputation'),
      hashAnswer('precomputed tables'),
      hashAnswer('rainbow tables'),
      hashAnswer('using rainbow tables'),
      hashAnswer('reusing work across accounts'),
      hashAnswer('reusing precomputed hashes'),
      hashAnswer('sharing work across users'),
      hashAnswer('a precomputed table'),
    ],
    solution:
      'A unique per-user salt makes every hash different even for identical passwords, so an attacker cannot precompute one table (a rainbow table) and reuse it across accounts. They must attack each account separately, and reuse no longer shows up as matching hashes.',
  },
  {
    id: 'pw-harden',
    labId: lab,
    title: 'Switch to a slow hash',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['CRY-05'],
    prompt:
      'On the Harden tab, re-store the passwords with a **salted, slow key-derivation function** (PBKDF2) and compare the attack cost. The lab marks this solved once you run the salted PBKDF2 scheme and see the per-guess cost jump.',
    hints: [
      'PBKDF2 repeats the hash many thousands of times per guess.',
      'Combine it with the per-user salt from the previous step.',
    ],
    solution:
      'A slow KDF like PBKDF2 (or bcrypt, scrypt, Argon2) multiplies the cost of every single guess by its iteration count, while the salt stops precomputation. Together they turn an instant breach into one that is computationally impractical, buying users time to change passwords after a leak.',
  },
  {
    id: 'pw-kdf',
    labId: lab,
    title: 'Name a good one',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['CRY-05'],
    prompt:
      'Name **one password hashing function** designed to be deliberately slow and suitable for storing passwords (not a general-purpose hash like SHA-256).',
    hints: [
      'There are four common answers; this lab uses one of them.',
      'Think PBKDF2, bcrypt, scrypt, or Argon2.',
    ],
    acceptedHashes: [
      hashAnswer('pbkdf2'),
      hashAnswer('bcrypt'),
      hashAnswer('scrypt'),
      hashAnswer('argon2'),
      hashAnswer('argon2id'),
    ],
    solution:
      'PBKDF2, bcrypt, scrypt, and Argon2 are all password hashing / key-derivation functions built to be slow and (except PBKDF2) memory-hard. Argon2id is the modern first choice; PBKDF2 and bcrypt remain widely used. Any general-purpose hash (SHA-256, MD5) is the wrong choice for passwords.',
  },
];
