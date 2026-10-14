/**
 * A deterministic model of a login endpoint under online attack, used to teach
 * authentication defenses. Nothing is hashed or sent anywhere — the "attack" is
 * a bounded walk through a wordlist, and each defense simply bounds it sooner.
 *
 * The arc: a weak password with no throttling falls to an online dictionary attack;
 * rate limiting, account lockout, and multi-factor authentication each stop the
 * same attack on their own; and verbose error messages leak which usernames
 * exist (username enumeration), which generic errors close.
 */

export const TARGET_USER = 'avery';
export const TARGET_PASSWORD = 'sunshine';
export const LOGIN_FLAG = 'CTF{weak_password_no_rate_limit}';

/** Attempts allowed in the window before throttling kicks in. */
export const RATE_LIMIT = 5;
/** Failed attempts before the account is locked. Lower than the rate-limit window
 * so the two defenses are visibly distinct in the attack report. */
export const LOCKOUT_THRESHOLD = 3;

/** A short list of the most common passwords, as an attacker would try them. */
export const WORDLIST: readonly string[] = [
  '123456',
  'password',
  'qwerty',
  'abc123',
  'letmein',
  'football',
  'iloveyou',
  'admin123',
  'welcome',
  'sunshine', // the target's password (10th guess)
  'dragon',
  'monkey',
];

/** Usernames that actually exist, for the enumeration probe. */
export const EXISTING_USERS: readonly string[] = ['avery', 'admin', 'jordan'];

export interface Defenses {
  rateLimit: boolean;
  lockout: boolean;
  genericErrors: boolean;
  mfa: boolean;
}

export const NO_DEFENSES: Defenses = {
  rateLimit: false,
  lockout: false,
  genericErrors: false,
  mfa: false,
};

export type BlockedBy = 'rate limiting' | 'account lockout' | 'multi-factor authentication' | null;

export interface AttackReport {
  /** How many guesses the attacker got to make before being stopped or winning. */
  attempts: number;
  /** The password was present in the attempted range. */
  found: boolean;
  /** The attacker actually obtained an authenticated session. */
  authenticated: boolean;
  blockedBy: BlockedBy;
  /** Hard lockout also locks out the real account owner (a denial of service). */
  legitimateUserLockedOut?: boolean;
  flag?: string;
}

/** Simulate an online dictionary attack (wordlist password guessing) against the target account. */
export function runAttack(defenses: Defenses): AttackReport {
  const idx = WORDLIST.indexOf(TARGET_PASSWORD);
  const needed = idx + 1; // attempts required to reach the correct password

  if (defenses.lockout && LOCKOUT_THRESHOLD < needed) {
    return {
      attempts: LOCKOUT_THRESHOLD,
      found: false,
      authenticated: false,
      blockedBy: 'account lockout',
      // Hard lockout is collateral: the real account owner is locked out too.
      legitimateUserLockedOut: true,
    };
  }
  if (defenses.rateLimit && RATE_LIMIT < needed) {
    return { attempts: RATE_LIMIT, found: false, authenticated: false, blockedBy: 'rate limiting' };
  }
  // The attacker reaches the correct password.
  if (defenses.mfa) {
    return {
      attempts: needed,
      found: true,
      authenticated: false,
      blockedBy: 'multi-factor authentication',
    };
  }
  return { attempts: needed, found: true, authenticated: true, blockedBy: null, flag: LOGIN_FLAG };
}

export interface ProbeResult {
  exists: boolean;
  message: string;
  /** Whether this response reveals the account's existence. */
  leaks: boolean;
}

/** Probe a username. Verbose errors leak existence; generic errors do not. */
export function probeUser(username: string, genericErrors: boolean): ProbeResult {
  const exists = EXISTING_USERS.includes(username.trim().toLowerCase());
  if (genericErrors) {
    return { exists, message: 'Incorrect username or password.', leaks: false };
  }
  return {
    exists,
    message: exists ? 'Incorrect password.' : 'No account with that username.',
    leaks: true,
  };
}
