import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { LOGIN_FLAG } from './engine';

const lab = 'login-security';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'login-crack',
    labId: lab,
    title: 'Break in with a wordlist',
    difficulty: 'beginner',
    points: 15,
    kind: 'flag',
    topicIds: ['IAM-02'],
    prompt:
      'With every defense off, launch the dictionary attack on the **Attack** tab. The weak password falls and you get a session — submit the flag it returns.',
    hints: [
      'The target reused a password that sits in the common-password wordlist.',
      'Nothing limits the number of guesses, so the attack just runs to the end.',
    ],
    acceptedHashes: [hashAnswer(LOGIN_FLAG)],
    solution: `A weak, reused password plus an endpoint that accepts unlimited guesses is all an online attack needs. The wordlist reaches the password in a handful of tries and the server hands over a session. The flag is **${LOGIN_FLAG}**. The fixes below each stop this exact run.`,
  },
  {
    id: 'login-stuffing',
    labId: lab,
    title: 'Name the attack',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['IAM-02'],
    prompt:
      'Trying a list of common passwords against one account&rsquo;s login form — betting the password is weak and guessable — has a two-word name. **What is it?** (Related terms accepted.)',
    hints: [
      'The guesses come from a wordlist of the most common passwords.',
      'It is online password guessing with a wordlist — a ___ attack.',
    ],
    acceptedHashes: [
      hashAnswer('dictionary attack'),
      hashAnswer('dictionary'),
      hashAnswer('password guessing'),
      hashAnswer('brute force'),
      hashAnswer('brute-force'),
      hashAnswer('online guessing'),
      hashAnswer('wordlist attack'),
    ],
    solution:
      'This is a **dictionary attack**: online password guessing that runs a curated wordlist of likely passwords against the login form. It differs from a pure brute force (which tries every possible combination) by using a shortlist of common passwords, and from **credential stuffing** (which replays username/password pairs leaked from other breaches, exploiting reuse). Rate limiting, lockout, bot detection, and — above all — MFA counter all three.',
  },
  {
    id: 'login-ratelimit',
    labId: lab,
    title: 'Throttle the guesses',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['IAM-02'],
    prompt:
      'Enable **rate limiting** and launch the attack again. The lab marks this solved once the attack is cut off before it reaches the password.',
    hints: [
      'Rate limiting caps how many attempts an address or account gets per window.',
      'The wordlist needs more guesses than the limit allows.',
    ],
    solution:
      'Rate limiting caps login attempts per account or source over a time window, so an online guessing attack runs out of budget long before it exhausts a wordlist. It is cheap and broadly effective; pair it with lockout and MFA, and apply it per-account as well as per-IP so a botnet cannot sidestep it.',
  },
  {
    id: 'login-lockout',
    labId: lab,
    title: 'Lock the account',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['IAM-02'],
    prompt:
      'Enable **account lockout** and launch the attack. The lab marks this solved once the account locks before the password is found.',
    hints: [
      'Lockout disables the account after a set number of consecutive failures.',
      'Tune the threshold so attackers are stopped but real users are rarely hit.',
    ],
    solution:
      'Account lockout disables logins after a threshold of consecutive failures, stopping sustained guessing. The trade-off is a denial-of-service risk — an attacker can lock out real users on purpose — so modern designs favour throttling, step-up verification, and MFA, using hard lockout sparingly.',
  },
  {
    id: 'login-mfa',
    labId: lab,
    title: 'Add a second factor',
    difficulty: 'intermediate',
    points: 25,
    kind: 'task',
    topicIds: ['IAM-03'],
    prompt:
      'Enable **multi-factor authentication** and launch the attack. The lab marks this solved once a correct password alone no longer yields a session.',
    hints: [
      'MFA requires something beyond the password — a code or a passkey.',
      'The attacker can find the password but still cannot complete the login.',
    ],
    solution:
      'Multi-factor authentication requires a second, separate factor (an authenticator code, a hardware passkey), so a stolen or guessed password is no longer enough. It is the single most effective defense against password guessing, credential stuffing, and phishing of passwords. Phishing-resistant factors like passkeys (WebAuthn) raise the bar further by binding the login to the real site.',
  },
  {
    id: 'login-enumeration',
    labId: lab,
    title: 'Spot the information leak',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['IAM-02'],
    prompt:
      'On the **Enumeration** tab, probe a real username and a fake one with verbose errors on. The endpoint answers differently, which lets an attacker learn which accounts exist. **What is this class of weakness called?** (Two words.)',
    hints: [
      'The attacker is building a list of valid accounts to target.',
      'The two words are &ldquo;username ___&rdquo; (or &ldquo;account ___&rdquo;).',
    ],
    acceptedHashes: [
      hashAnswer('username enumeration'),
      hashAnswer('user enumeration'),
      hashAnswer('account enumeration'),
      hashAnswer('enumeration'),
    ],
    solution:
      '**Username (account) enumeration** is when login, signup, or reset responses differ for existing versus non-existing accounts — through the message, the status code, or the response time. Attackers use it to build target lists. The fix is uniform, generic responses (and constant-time handling) so valid and invalid accounts are indistinguishable.',
  },
];
