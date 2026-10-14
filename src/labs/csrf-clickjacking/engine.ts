/**
 * A deterministic model of two cross-site trust attacks that abuse a logged-in
 * victim's browser: cross-site request forgery (CSRF) and clickjacking. No real
 * cross-origin request is ever made — these functions model what a browser and
 * server would do, so the learner can turn each defense on and watch the attack
 * fail.
 *
 * CSRF rides the victim's session cookie to submit a state-changing request from
 * an attacker's page. SameSite cookies stop the cookie from riding along, and an
 * anti-CSRF token (which the attacker's origin cannot read) stops the forged
 * request. Clickjacking frames the real site and steals a click; a frame-busting
 * response header (frame-ancestors / X-Frame-Options) stops the framing.
 */

export const CSRF_FLAG = 'CTF{forged_request_rode_your_cookie}';
export const CLICKJACK_FLAG = 'CTF{your_click_was_hijacked}';

export const ATTACKER_ORIGIN = 'https://free-prizes.example';
export const BANK_ORIGIN = 'https://bank.example.test';

export interface CsrfDefenses {
  /** SameSite=Lax/Strict: the session cookie is not sent on a cross-site POST. */
  sameSite: boolean;
  /** The server requires an unguessable anti-CSRF token the attacker cannot read. */
  csrfToken: boolean;
}

export const CSRF_NONE: CsrfDefenses = { sameSite: false, csrfToken: false };

export interface CsrfResult {
  accepted: boolean;
  /** Whether the session cookie rode along on the cross-site request. */
  carriedCookie: boolean;
  reason: string;
  flag?: string;
}

/** Model the forged cross-site "transfer funds" POST from the attacker's page. */
export function forgeTransfer(defenses: CsrfDefenses): CsrfResult {
  // A cross-site POST carries the session cookie unless SameSite blocks it.
  const carriedCookie = !defenses.sameSite;
  // The attacker's origin cannot read the bank's page, so it cannot include a token.
  if (defenses.csrfToken) {
    return {
      accepted: false,
      carriedCookie,
      reason: 'Rejected: the forged request carries no anti-CSRF token, and the attacker origin cannot read one.',
    };
  }
  if (!carriedCookie) {
    return {
      accepted: false,
      carriedCookie,
      reason: 'Rejected: the SameSite cookie was not sent on a cross-site request, so the server sees no session.',
    };
  }
  return {
    accepted: true,
    carriedCookie,
    reason: "Accepted: the browser attached the victim's session cookie and the server trusted the request.",
    flag: CSRF_FLAG,
  };
}

export interface ClickjackResult {
  framed: boolean;
  clickStolen: boolean;
  reason: string;
  flag?: string;
}

/**
 * Model the clickjacking attack: the attacker's page frames the bank in a
 * transparent iframe over a decoy. `frameProtection` = the bank sends
 * frame-ancestors 'none' (or X-Frame-Options: DENY).
 */
export function framingAttack(frameProtection: boolean): ClickjackResult {
  if (frameProtection) {
    return {
      framed: false,
      clickStolen: false,
      reason: "Blocked: the browser refused to frame the bank (frame-ancestors 'none' / X-Frame-Options: DENY).",
    };
  }
  return {
    framed: true,
    clickStolen: true,
    reason: "The bank loads in a transparent iframe over a decoy; the victim's click lands on the hidden Transfer button.",
    flag: CLICKJACK_FLAG,
  };
}
