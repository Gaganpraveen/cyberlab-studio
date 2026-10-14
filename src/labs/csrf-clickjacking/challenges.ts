import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { CLICKJACK_FLAG, CSRF_FLAG } from './engine';

const lab = 'csrf-clickjacking';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'csrf-forge',
    labId: lab,
    title: 'Forge a transfer',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['WEB-06'],
    prompt:
      'On the **CSRF** tab, with no defenses on, fire the attacker page&rsquo;s hidden form. The victim is logged into the bank, so their browser attaches the session cookie and the transfer goes through. Submit the flag.',
    hints: [
      'The attacker&rsquo;s page cannot read the bank&rsquo;s cookie, but the browser still sends it.',
      'A state-changing request with no anti-forgery control is all this needs.',
    ],
    acceptedHashes: [hashAnswer(CSRF_FLAG)],
    solution: `The browser automatically attaches cookies for the destination site, so a form on the attacker&rsquo;s page can make an authenticated, state-changing request without ever reading the cookie. That is **cross-site request forgery**. The flag is **${CSRF_FLAG}**.`,
  },
  {
    id: 'csrf-term',
    labId: lab,
    title: 'Name the attack',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['WEB-06'],
    prompt:
      'An attacker&rsquo;s page makes a logged-in victim&rsquo;s browser send a state-changing request to another site, abusing the cookie the browser attaches automatically. **What is this attack called?** (A four-letter acronym or its full name.)',
    hints: [
      'The acronym is four letters and starts with C.',
      'It expands to &ldquo;cross-site request ___&rdquo;.',
    ],
    acceptedHashes: [
      hashAnswer('csrf'),
      hashAnswer('cross-site request forgery'),
      hashAnswer('cross site request forgery'),
      hashAnswer('xsrf'),
      hashAnswer('request forgery'),
    ],
    solution:
      '**CSRF — cross-site request forgery.** The attack works because browsers attach a site&rsquo;s cookies to any request to that site, including ones triggered from another origin. The server cannot tell a forged request from a genuine one unless it adds a control the attacker&rsquo;s origin cannot satisfy.',
  },
  {
    id: 'csrf-samesite',
    labId: lab,
    title: 'Pin the cookie with SameSite',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['WEB-06', 'WEB-04'],
    prompt:
      'Enable **SameSite cookies** and fire the attack again. The lab marks this solved once the session cookie no longer rides along on the cross-site request.',
    hints: [
      'SameSite=Lax or Strict tells the browser not to send the cookie on cross-site requests.',
      'With no cookie, the server sees an unauthenticated request and rejects it.',
    ],
    solution:
      'A **SameSite=Lax or Strict** cookie is withheld on cross-site requests, so the forged POST arrives with no session and is rejected. SameSite=Lax is a sensible default; Strict is tighter but can log users out when they follow inbound links. Treat it as defense in depth, though, not the primary control: OWASP recommends anti-CSRF tokens as the main defense, with SameSite layered on top — browser differences and edge cases (some top-level navigations, older clients) mean SameSite alone should not be relied on.',
  },
  {
    id: 'csrf-token',
    labId: lab,
    title: 'Require an anti-CSRF token',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['WEB-06'],
    prompt:
      'Enable the **anti-CSRF token** requirement and fire the attack. The lab marks this solved once the forged request is rejected for lacking a valid token.',
    hints: [
      'The token is embedded in the real page and tied to the session.',
      'The attacker&rsquo;s origin cannot read the bank&rsquo;s page, so it cannot include the token.',
    ],
    solution:
      'An **anti-CSRF token** is an unguessable value the server puts in the genuine page and checks on each state-changing request. Because the same-origin policy stops the attacker&rsquo;s page from reading the bank&rsquo;s DOM, it cannot learn the token, so the forged request fails. The synchronizer-token and double-submit-cookie patterns both implement this.',
  },
  {
    id: 'clickjack-forge',
    labId: lab,
    title: 'Steal a click',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['WEB-08'],
    prompt:
      'On the **Clickjacking** tab, with no frame protection, load the attacker page. It frames the real bank in a transparent layer over a decoy button, so the victim&rsquo;s click lands on the hidden control. Submit the flag.',
    hints: [
      'The bank is loaded in an invisible iframe stacked over a tempting decoy.',
      'The victim thinks they are clicking the decoy; the click hits the framed page.',
    ],
    acceptedHashes: [hashAnswer(CLICKJACK_FLAG)],
    solution: `Clickjacking overlays the real site in a transparent frame on top of a decoy, so a click meant for the decoy is delivered to the framed page&rsquo;s control. The victim authorizes an action they never saw. The flag is **${CLICKJACK_FLAG}**.`,
  },
  {
    id: 'clickjack-defense',
    labId: lab,
    title: 'Refuse to be framed',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['WEB-08', 'WEB-07'],
    prompt:
      "Turn on **frame protection** (Content-Security-Policy frame-ancestors 'none', or X-Frame-Options: DENY) and reload the attacker page. The lab marks this solved once the browser refuses to frame the bank.",
    hints: [
      "frame-ancestors 'none' tells the browser no site may embed this page in a frame.",
      'With framing refused, there is no hidden layer for the click to hit.',
    ],
    solution:
      "The response header **Content-Security-Policy: frame-ancestors 'none'** (or the older **X-Frame-Options: DENY**) tells the browser that no other site may embed this page. The attacker&rsquo;s frame never renders, so there is nothing to click through. Set it on every sensitive, state-changing page.",
  },
];
