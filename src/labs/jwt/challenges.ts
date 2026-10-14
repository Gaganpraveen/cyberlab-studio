import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';

const lab = 'jwt';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'jwt-read-role',
    labId: lab,
    title: 'Read the token',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['IAM-04'],
    prompt:
      'A JWT is signed, but it is **not** encrypted: anyone holding it can read its contents. Decode the session token on the Decode tab. **What is the `role` claim** in its payload?',
    hints: [
      'The middle section of a JWT is the payload, encoded with base64url (not encryption).',
      'The Decode tab shows the decoded header and payload for you.',
    ],
    acceptedHashes: [hashAnswer('student')],
    solution:
      'The role is **student**. The three parts of a JWT (header, payload, signature) are only base64url-encoded, so the payload is plainly readable. A signature proves a token has not been changed; it does **not** hide what is inside. Never put secrets in a JWT payload.',
  },
  {
    id: 'jwt-alg-none',
    labId: lab,
    title: 'Forge with alg: none',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['IAM-04', 'CRY-04'],
    prompt:
      'The vulnerable verifier trusts the token to say how it should be checked. On the Forge tab, build a token whose header says `alg: none` and whose payload claims `role: admin`, then verify it in **Vulnerable** mode. It is accepted with no signature at all. The lab marks this solved when that happens.',
    hints: [
      'An `alg: none` token has an empty signature — there is nothing to check.',
      'The bug is that the verifier reads the algorithm from the attacker-controlled header.',
    ],
    solution:
      'Setting `alg: none` tells a naive verifier "there is no signature to check," and it believes the token anyway. Because the header is attacker-controlled, trusting it is the whole mistake. A correct verifier never reads the algorithm from the token; it pins the one algorithm it expects.',
  },
  {
    id: 'jwt-crack-secret',
    labId: lab,
    title: 'Crack the weak secret',
    difficulty: 'intermediate',
    points: 20,
    kind: 'answer',
    topicIds: ['CRY-04'],
    prompt:
      'The real token is signed with HS256 using a weak secret. On the Crack tab, run the dictionary of common secrets against the token. **What secret** was used to sign it?',
    hints: [
      'HS256 is a keyed hash (HMAC). Re-sign the token with each candidate and compare the signature.',
      'The secret is an obvious, guessable word.',
    ],
    acceptedHashes: [hashAnswer('changeme')],
    solution:
      'The secret is **changeme**. Because HMAC is deterministic, an attacker can try a wordlist offline: re-sign the token with each guess and compare. A guessable secret means anyone can mint valid tokens, so a JWT secret must be long and random, like any other key.',
  },
  {
    id: 'jwt-forge-signed',
    labId: lab,
    title: 'Mint an admin token',
    difficulty: 'advanced',
    points: 25,
    kind: 'task',
    topicIds: ['IAM-04', 'CRY-04'],
    prompt:
      'Now that you have the secret, forge a **properly signed** HS256 token that claims `role: admin`, and verify it in **Strict** mode. It passes. The lab marks this solved when a token you signed with the cracked secret is accepted as admin by the strict verifier.',
    hints: [
      'Use the cracked secret from the previous challenge to sign a new payload.',
      'A correct verifier cannot help here: the signature is genuinely valid.',
    ],
    solution:
      'With the secret known, you can produce signatures the server accepts, so even a perfectly strict verifier trusts your forged admin token. This is why pinning the algorithm is necessary but not sufficient: the secret must also be strong. Two defenses, both required.',
  },
  {
    id: 'jwt-harden',
    labId: lab,
    title: 'Pin the algorithm',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['IAM-04', 'CRY-04'],
    prompt:
      'Switch the verifier to **Strict** mode and run the attack battery. Strict mode pins the algorithm to HS256 and always requires a valid signature, so the `alg: none` forgery and the tampered token are both rejected. The lab marks this solved when the strict verifier handles the whole battery correctly.',
    hints: [
      'Strict mode ignores the token’s own `alg` and rejects anything that is not HS256.',
      'Run the battery in both modes and compare which rows each one gets right.',
    ],
    solution:
      'A safe verifier decides the algorithm itself (here, only HS256), rejects `alg: none`, and recomputes the signature over the header and payload. That stops forgery by header manipulation and any change to the payload. Combined with a strong secret, it closes the door.',
  },
  {
    id: 'jwt-defense',
    labId: lab,
    title: 'Name the trap',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['IAM-04'],
    prompt:
      'In a few words, **what part of a JWT must a verifier never trust** to decide how to check the token? (It is the field attackers change to mount the `alg: none` and algorithm-confusion attacks.)',
    hints: [
      'It lives in the first section of the token.',
      'Think "the ____ header" — the field that names the algorithm.',
    ],
    acceptedHashes: [
      hashAnswer('the alg header'),
      hashAnswer('alg header'),
      hashAnswer('the algorithm header'),
      hashAnswer('algorithm header'),
      hashAnswer('the alg field'),
      hashAnswer('alg'),
      hashAnswer('the alg claim'),
      hashAnswer("the token's alg header"),
      hashAnswer('the header alg'),
    ],
    solution:
      'A verifier must never trust the token’s own **alg header** to decide how to verify it. The algorithm is chosen by the server and pinned; the token only gets to carry data, never to dictate how it is checked.',
  },
];
